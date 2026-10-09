import { InvoiceStatus } from "@prisma/client";

export interface MemoryMerchant {
  id: string;
  walletAddress: string;
  displayName: string;
  businessName: string | null;
  country: string | null;
  defaultCurrencyDisplay: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryInvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitAmountUsdc: bigint;
}

export interface MemoryPaymentEvent {
  id: string;
  invoiceId: string;
  txHash: string;
  logIndex: number;
  payerAddress: string;
  amountUsdc: bigint;
  blockNumber: bigint;
  chainId: number;
  confirmedAt: Date;
}

export interface MemoryAuditLog {
  id: string;
  merchantId: string | null;
  invoiceId: string | null;
  action: string;
  details: string | null;
  createdAt: Date;
}

export interface MemoryInvoice {
  id: string;
  publicId: string;
  merchantId: string;
  invoiceNumber: string;
  title: string;
  notes: string | null;
  clientName: string | null;
  clientEmail: string | null;
  currencyDisplay: string;
  amountUsdc: bigint;
  paidAmountUsdc: bigint;
  dueDate: Date;
  status: InvoiceStatus;
  onchainInvoiceId: string;
  createdAt: Date;
  updatedAt: Date;
}

class InMemoryDatabase {
  private merchants = new Map<string, MemoryMerchant>();
  private invoices = new Map<string, MemoryInvoice>();
  private items = new Map<string, MemoryInvoiceItem>();
  private payments = new Map<string, MemoryPaymentEvent>();
  private auditLogs: MemoryAuditLog[] = [];
  private idCounter = 1;

  private generateId(prefix: string) {
    return `${prefix}_${Date.now()}_${this.idCounter++}`;
  }

  readonly merchant = {
    findUnique: async ({ where }: { where: { id?: string; walletAddress?: string } }) => {
      if (where.id) {
        return this.merchants.get(where.id) || null;
      }
      if (where.walletAddress) {
        const addr = where.walletAddress.toLowerCase();
        for (const m of this.merchants.values()) {
          if (m.walletAddress.toLowerCase() === addr) return m;
        }
      }
      return null;
    },

    upsert: async ({
      where,
      update,
      create,
    }: {
      where: { walletAddress: string };
      update: Partial<MemoryMerchant>;
      create: {
        walletAddress: string;
        displayName: string;
        businessName?: string | null;
        country?: string | null;
        defaultCurrencyDisplay?: string;
      };
    }) => {
      const existing = await this.merchant.findUnique({ where });
      if (existing) {
        const updated: MemoryMerchant = {
          ...existing,
          ...update,
          updatedAt: new Date(),
        };
        this.merchants.set(existing.id, updated);
        return updated;
      }

      const id = this.generateId("merch");
      const created: MemoryMerchant = {
        id,
        walletAddress: create.walletAddress.toLowerCase(),
        displayName: create.displayName,
        businessName: create.businessName || null,
        country: create.country || null,
        defaultCurrencyDisplay: create.defaultCurrencyDisplay || "USD",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.merchants.set(id, created);
      return created;
    },

    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<MemoryMerchant>;
    }) => {
      const existing = this.merchants.get(where.id);
      if (!existing) throw new Error("Merchant not found");
      const updated: MemoryMerchant = {
        ...existing,
        ...data,
        updatedAt: new Date(),
      };
      this.merchants.set(where.id, updated);
      return updated;
    },

    delete: async ({ where }: { where: { id: string } }) => {
      const existing = this.merchants.get(where.id);
      if (!existing) throw new Error("Merchant not found");
      this.merchants.delete(where.id);
      // Cascade delete invoices
      for (const [invId, inv] of this.invoices.entries()) {
        if (inv.merchantId === where.id) {
          this.invoices.delete(invId);
        }
      }
      return existing;
    },
  };

  readonly invoice = {
    findUnique: async ({
      where,
      include,
    }: {
      where: { id?: string; publicId?: string };
      include?: {
        items?: boolean;
        paymentEvents?: boolean;
        merchant?: boolean;
        _count?: { select: { paymentEvents?: boolean } };
      };
    }) => {
      let inv: MemoryInvoice | undefined;
      if (where.id) inv = this.invoices.get(where.id);
      else if (where.publicId) {
        for (const i of this.invoices.values()) {
          if (i.publicId === where.publicId) {
            inv = i;
            break;
          }
        }
      }
      if (!inv) return null;

      const result: any = { ...inv };
      if (include?.items) {
        result.items = Array.from(this.items.values()).filter((it) => it.invoiceId === inv!.id);
      }
      if (include?.paymentEvents) {
        result.paymentEvents = Array.from(this.payments.values()).filter(
          (p) => p.invoiceId === inv!.id
        );
      }
      if (include?.merchant) {
        result.merchant = this.merchants.get(inv.merchantId) || null;
      }
      if (include?._count?.select?.paymentEvents) {
        const count = Array.from(this.payments.values()).filter((p) => p.invoiceId === inv!.id).length;
        result._count = { paymentEvents: count };
      }
      return result;
    },

    findMany: async ({
      where,
      orderBy,
      take,
      skip,
      include,
    }: {
      where?: {
        merchantId?: string;
        status?: InvoiceStatus;
        OR?: Array<{ title?: { contains?: string }; clientName?: { contains?: string }; invoiceNumber?: { contains?: string } }>;
      };
      orderBy?: { createdAt?: "asc" | "desc" };
      take?: number;
      skip?: number;
      include?: { items?: boolean; paymentEvents?: boolean };
    }) => {
      let list = Array.from(this.invoices.values());

      if (where?.merchantId) {
        list = list.filter((i) => i.merchantId === where.merchantId);
      }
      if (where?.status) {
        list = list.filter((i) => i.status === where.status);
      }
      if (where?.OR && where.OR.length > 0) {
        list = list.filter((i) => {
          return where.OR!.some((cond) => {
            if (cond.title?.contains && i.title.toLowerCase().includes(cond.title.contains.toLowerCase())) return true;
            if (cond.clientName?.contains && (i.clientName || "").toLowerCase().includes(cond.clientName.contains.toLowerCase())) return true;
            if (cond.invoiceNumber?.contains && i.invoiceNumber.toLowerCase().includes(cond.invoiceNumber.contains.toLowerCase())) return true;
            return false;
          });
        });
      }

      if (orderBy?.createdAt === "desc") {
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      } else if (orderBy?.createdAt === "asc") {
        list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }

      if (skip !== undefined && skip > 0) {
        list = list.slice(skip);
      }
      if (take !== undefined && take > 0) {
        list = list.slice(0, take);
      }

      return list.map((inv) => {
        const res: any = { ...inv };
        if (include?.items) {
          res.items = Array.from(this.items.values()).filter((it) => it.invoiceId === inv.id);
        }
        if (include?.paymentEvents) {
          res.paymentEvents = Array.from(this.payments.values()).filter((p) => p.invoiceId === inv.id);
        }
        return res;
      });
    },

    count: async ({
      where,
    }: {
      where?: {
        merchantId?: string;
        status?: InvoiceStatus;
        OR?: Array<{ title?: { contains?: string }; clientName?: { contains?: string }; invoiceNumber?: { contains?: string } }>;
      };
    }) => {
      let list = Array.from(this.invoices.values());
      if (where?.merchantId) {
        list = list.filter((i) => i.merchantId === where.merchantId);
      }
      if (where?.status) {
        list = list.filter((i) => i.status === where.status);
      }
      if (where?.OR && where.OR.length > 0) {
        list = list.filter((i) => {
          return where.OR!.some((cond) => {
            if (cond.title?.contains && i.title.toLowerCase().includes(cond.title.contains.toLowerCase())) return true;
            if (cond.clientName?.contains && (i.clientName || "").toLowerCase().includes(cond.clientName.contains.toLowerCase())) return true;
            if (cond.invoiceNumber?.contains && i.invoiceNumber.toLowerCase().includes(cond.invoiceNumber.contains.toLowerCase())) return true;
            return false;
          });
        });
      }
      return list.length;
    },

    create: async ({
      data,
      include,
    }: {
      data: {
        publicId: string;
        merchantId: string;
        invoiceNumber: string;
        title: string;
        notes?: string | null;
        clientName?: string | null;
        clientEmail?: string | null;
        dueDate: Date;
        status: InvoiceStatus;
        amountUsdc: bigint;
        paidAmountUsdc: bigint;
        onchainInvoiceId: string;
        items?: {
          create: Array<{
            description: string;
            quantity: number;
            unitAmountUsdc: bigint;
          }>;
        };
      };
      include?: { items?: boolean };
    }) => {
      const id = this.generateId("inv");
      const invoice: MemoryInvoice = {
        id,
        publicId: data.publicId,
        merchantId: data.merchantId,
        invoiceNumber: data.invoiceNumber,
        title: data.title,
        notes: data.notes || null,
        clientName: data.clientName || null,
        clientEmail: data.clientEmail || null,
        currencyDisplay: "USD",
        amountUsdc: data.amountUsdc,
        paidAmountUsdc: data.paidAmountUsdc,
        dueDate: data.dueDate,
        status: data.status,
        onchainInvoiceId: data.onchainInvoiceId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.invoices.set(id, invoice);

      const itemsList: MemoryInvoiceItem[] = [];
      if (data.items?.create) {
        for (const item of data.items.create) {
          const itemId = this.generateId("item");
          const createdItem: MemoryInvoiceItem = {
            id: itemId,
            invoiceId: id,
            description: item.description,
            quantity: item.quantity,
            unitAmountUsdc: item.unitAmountUsdc,
          };
          this.items.set(itemId, createdItem);
          itemsList.push(createdItem);
        }
      }

      const result: any = { ...invoice };
      if (include?.items) {
        result.items = itemsList;
      }
      return result;
    },

    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<MemoryInvoice>;
    }) => {
      const existing = this.invoices.get(where.id);
      if (!existing) throw new Error("Invoice not found");
      const updated: MemoryInvoice = {
        ...existing,
        ...data,
        updatedAt: new Date(),
      };
      this.invoices.set(where.id, updated);
      return updated;
    },

    delete: async ({ where }: { where: { id: string } }) => {
      const existing = this.invoices.get(where.id);
      if (!existing) throw new Error("Invoice not found");
      this.invoices.delete(where.id);
      // Remove line items
      for (const [itemId, item] of this.items.entries()) {
        if (item.invoiceId === where.id) this.items.delete(itemId);
      }
      return existing;
    },
  };

  readonly auditLog = {
    create: async ({
      data,
    }: {
      data: {
        merchantId?: string | null;
        invoiceId?: string | null;
        action: string;
        details?: string | null;
      };
    }) => {
      const log: MemoryAuditLog = {
        id: this.generateId("audit"),
        merchantId: data.merchantId || null,
        invoiceId: data.invoiceId || null,
        action: data.action,
        details: data.details || null,
        createdAt: new Date(),
      };
      this.auditLogs.push(log);
      return log;
    },
  };

  async $transaction<T>(fn: (tx: InMemoryDatabase) => Promise<T>): Promise<T> {
    return await fn(this);
  }
}

export const inMemoryDb = new InMemoryDatabase();
