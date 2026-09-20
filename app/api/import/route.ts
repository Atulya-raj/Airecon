import { badRequest, withOrg } from "@/lib/api";
import { getReconStore } from "@/lib/recon/store";
import type { NewLedgerEntry, NewTransaction } from "@/lib/recon/store/types";

interface ImportBankPayloadItem {
  amount: number | string;
  currency?: "USD" | "INR" | "EUR" | "GBP";
  txnDate: string;
  payeeRaw?: string | null;
  memo?: string | null;
  accountId?: string;
  externalId?: string | null;
}

interface ImportLedgerPayloadItem {
  amount: number | string;
  currency?: "USD" | "INR" | "EUR" | "GBP";
  entryDate: string;
  vendorName?: string | null;
  memo?: string | null;
  entryType?: "invoice" | "expense" | "refund";
  externalId?: string | null;
}

interface ImportRequestBody {
  type: "bank" | "ledger";
  transactions?: ImportBankPayloadItem[];
  entries?: ImportLedgerPayloadItem[];
}

export async function POST(request: Request) {
  return withOrg(request, async (session) => {
    const store = getReconStore();
    let body: ImportRequestBody;

    try {
      body = (await request.json()) as ImportRequestBody;
    } catch {
      return badRequest("Invalid JSON body");
    }

    const { type, transactions, entries } = body;

    if (type === "bank") {
      if (!Array.isArray(transactions) || transactions.length === 0) {
        return badRequest("Transactions array is required and must not be empty");
      }

      // Assign orgId
      const toInsert: NewTransaction[] = transactions.map((t: ImportBankPayloadItem) => ({
        ...t,
        orgId: session.orgId,
        amount: Math.abs(Number(t.amount)),
        currency: t.currency ?? "USD",
        txnDate: t.txnDate,
        payeeRaw: t.payeeRaw ?? "Unnamed Payee",
        memo: t.memo ?? null,
        accountId: t.accountId ?? "imported-csv",
        externalId: t.externalId ?? `imp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        status: "unmatched",
      }));

      const inserted = await store.upsertTransactions(session.orgId, toInsert);

      await store.insertNotification({
        orgId: session.orgId,
        kind: "forecast_update",
        transactionId: null,
        message: `Imported ${inserted.length} bank transaction${inserted.length === 1 ? "" : "s"} successfully.`,
      });

      return Response.json({
        success: true,
        count: inserted.length,
        type: "bank",
      });
    }

    if (type === "ledger") {
      if (!Array.isArray(entries) || entries.length === 0) {
        return badRequest("Entries array is required and must not be empty");
      }

      const toInsert: NewLedgerEntry[] = entries.map((e: ImportLedgerPayloadItem) => ({
        ...e,
        orgId: session.orgId,
        amount: Math.abs(Number(e.amount)),
        currency: e.currency ?? "USD",
        entryDate: e.entryDate,
        vendorName: e.vendorName ?? null,
        memo: e.memo ?? null,
        entryType: e.entryType ?? "expense",
        externalId: e.externalId ?? `imp-ledg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      }));

      const inserted = await store.insertLedgerEntries(session.orgId, toInsert);

      await store.insertNotification({
        orgId: session.orgId,
        kind: "forecast_update",
        transactionId: null,
        message: `Imported ${inserted.length} open ledger ${inserted.length === 1 ? "entry" : "entries"} successfully.`,
      });

      return Response.json({
        success: true,
        count: inserted.length,
        type: "ledger",
      });
    }

    return badRequest("Invalid import type. Expected 'bank' or 'ledger'.");
  });
}
