import { type NextRequest, NextResponse } from "next/server";
import {
  verifyCronAuthorization,
  runReconciliation,
} from "@/lib/settlement/reconciliation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const authCheck = verifyCronAuthorization(authHeader);

    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.statusCode || 401 }
      );
    }

    const result = await runReconciliation();

    return NextResponse.json(
      {
        success: true,
        data: {
          acquiredLock: result.acquiredLock,
          fromBlock: result.fromBlock?.toString(),
          toBlock: result.toBlock?.toString(),
          latestBlock: result.latestBlock?.toString(),
          logsFound: result.logsFound,
          newEventsStored: result.newEventsStored,
          invoicesSettled: result.invoicesSettled,
          expiredInvoicesCount: result.expiredInvoicesCount,
          message: result.message,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Reconciliation cron error:", err);
    return NextResponse.json(
      { error: "Internal error executing reconciliation cron" },
      { status: 500 }
    );
  }
}

// Support POST for webhooks or manual invocations with Bearer auth
export async function POST(req: NextRequest) {
  return GET(req);
}
