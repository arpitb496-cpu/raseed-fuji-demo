import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { requireAuthenticatedMerchant } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db";
import { CreateInvoiceSchema } from "@/lib/validation/invoice";
import {
  generateUnguessablePublicId,
  deriveOnchainInvoiceId,
  formatInvoiceNumber,
  evaluateInvoiceStatus,
} from "@/lib/invoice-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { InvoiceStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    const { merchantId } = requireAuthenticatedMerchant(session);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const statusParam = searchParams.get("status") || "ALL";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const skip = (page - 1) * limit;

    const whereClause: {
      merchantId: string;
      status?: InvoiceStatus;
      OR?: Array<{ [key: string]: { contains: string; mode: "insensitive" } }>;
    } = {
      merchantId,
    };

    if (statusParam !== "ALL" && Object.values(InvoiceStatus).includes(statusParam as InvoiceStatus)) {
      whereClause.status = statusParam as InvoiceStatus;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { clientName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [invoices, totalCount] = await Promise.all([
      prisma.invoice.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          items: true,
          _count: { select: { paymentEvents: true } },
        },
      }),
      prisma.invoice.count({ where: whereClause }),
    ]);

    const formattedInvoices = invoices.map((inv) => ({
      ...inv,
      status: evaluateInvoiceStatus(inv.status, inv.dueDate),
      amountUsdc: inv.amountUsdc.toString(),
      paidAmountUsdc: inv.paidAmountUsdc.toString(),
      items: inv.items.map((it) => ({
        ...it,
        unitAmountUsdc: it.unitAmountUsdc.toString(),
      })),
    }));

    return NextResponse.json({
      invoices: formattedInvoices,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit) || 1,
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "statusCode" in err) {
      const status = (err as { statusCode: number }).statusCode || 401;
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status });
    }
    console.error("GET /api/invoices error:", err);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    const { merchantId } = requireAuthenticatedMerchant(session);

    // Rate Limit: 30 invoice creations per 5 minutes per merchant
    const rateLimit = checkRateLimit(`create_invoice_${merchantId}`, 30, 300);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many invoice creation requests. Please slow down." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parseResult = CreateInvoiceSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parseResult.error.issues },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Sequential invoice count for this merchant
    const merchantInvoiceCount = await prisma.invoice.count({
      where: { merchantId },
    });
    const invoiceNumber = formatInvoiceNumber(merchantInvoiceCount + 1);

    // Unguessable publicId and deterministic onchain bytes32 invoiceId
    const publicId = generateUnguessablePublicId();
    const onchainInvoiceId = deriveOnchainInvoiceId(publicId);

    // Calculate micro-USDC total strictly in integer BigInt
    let totalMicroUsdc = 0n;
    const itemsData = data.items.map((item) => {
      // 1 USDC = 1,000,000 micro-units
      const unitAmountUsdc = BigInt(Math.round(item.unitPriceUsdc * 1_000_000));
      const lineTotal = unitAmountUsdc * BigInt(item.quantity);
      totalMicroUsdc += lineTotal;
      return {
        description: item.description,
        quantity: item.quantity,
        unitAmountUsdc,
      };
    });

    const newInvoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          publicId,
          merchantId,
          invoiceNumber,
          title: data.title,
          notes: data.notes || null,
          clientName: data.clientName || null,
          clientEmail: data.clientEmail || null,
          dueDate: new Date(data.dueDate),
          status: InvoiceStatus.DRAFT,
          amountUsdc: totalMicroUsdc,
          paidAmountUsdc: 0n,
          onchainInvoiceId,
          items: {
            create: itemsData,
          },
        },
        include: {
          items: true,
        },
      });

      // Audit log entry
      await tx.auditLog.create({
        data: {
          merchantId,
          invoiceId: created.id,
          action: "INVOICE_CREATED",
          details: JSON.stringify({
            invoiceNumber,
            publicId,
            amountUsdc: totalMicroUsdc.toString(),
          }),
        },
      });

      return created;
    });

    return NextResponse.json({
      success: true,
      invoice: {
        ...newInvoice,
        amountUsdc: newInvoice.amountUsdc.toString(),
        paidAmountUsdc: newInvoice.paidAmountUsdc.toString(),
        items: newInvoice.items.map((it) => ({
          ...it,
          unitAmountUsdc: it.unitAmountUsdc.toString(),
        })),
      },
    }, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "statusCode" in err) {
      const status = (err as { statusCode: number }).statusCode || 401;
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status });
    }
    console.error("POST /api/invoices error:", err);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
