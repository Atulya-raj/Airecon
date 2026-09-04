import { z } from "zod";
import type { Currency } from "./types";
import type { NewTransaction } from "./store";

/**
 * Aggregator payload shapes. The adapter is the only place that knows about
 * provider-specific formats — everything downstream sees NewTransaction.
 */
export const plaidTransactionSchema = z.object({
  transaction_id: z.string(),
  account_id: z.string(),
  amount: z.number(),
  iso_currency_code: z.string().nullable().optional(),
  date: z.string(),
  name: z.string().nullable().optional(),
  merchant_name: z.string().nullable().optional(),
  original_description: z.string().nullable().optional(),
  pending: z.boolean().optional(),
});

export const tellerTransactionSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  amount: z.string(),
  date: z.string(),
  description: z.string().nullable().optional(),
  details: z
    .object({ counterparty: z.object({ name: z.string().nullable() }).optional() })
    .optional(),
  status: z.string().optional(),
});

export type PlaidTransaction = z.infer<typeof plaidTransactionSchema>;
export type TellerTransaction = z.infer<typeof tellerTransactionSchema>;

export type Aggregator = "plaid" | "teller";

/**
 * Plaid reports outflows as positive; the ledger side treats spend as a
 * positive expense, so the sign is normalized here rather than in the matcher.
 */
export function fromPlaid(txn: PlaidTransaction): NewTransaction {
  return {
    orgId: "",
    accountId: txn.account_id,
    externalId: `plaid:${txn.transaction_id}`,
    amount: Math.abs(txn.amount),
    currency: normalizeCurrency(txn.iso_currency_code),
    txnDate: normalizeDate(txn.date),
    payeeRaw: txn.merchant_name ?? txn.name ?? null,
    memo: txn.original_description ?? null,
  };
}

export function fromTeller(txn: TellerTransaction): NewTransaction {
  return {
    orgId: "",
    accountId: txn.account_id,
    externalId: `teller:${txn.id}`,
    amount: Math.abs(Number(txn.amount)),
    currency: "USD",
    txnDate: normalizeDate(txn.date),
    payeeRaw: txn.details?.counterparty?.name ?? txn.description ?? null,
    memo: txn.description ?? null,
  };
}

/** Pending transactions are skipped: they are re-issued once they settle. */
export function normalizeBatch(
  aggregator: Aggregator,
  orgId: string,
  payload: unknown[]
): NewTransaction[] {
  const normalized: NewTransaction[] = [];
  for (const raw of payload) {
    if (aggregator === "plaid") {
      const parsed = plaidTransactionSchema.parse(raw);
      if (parsed.pending) continue;
      normalized.push({ ...fromPlaid(parsed), orgId });
    } else {
      const parsed = tellerTransactionSchema.parse(raw);
      if (parsed.status === "pending") continue;
      normalized.push({ ...fromTeller(parsed), orgId });
    }
  }
  return dedupeByExternalId(normalized);
}

function dedupeByExternalId(transactions: NewTransaction[]): NewTransaction[] {
  const seen = new Set<string>();
  return transactions.filter((t) => {
    if (!t.externalId) return true;
    if (seen.has(t.externalId)) return false;
    seen.add(t.externalId);
    return true;
  });
}

function normalizeCurrency(code: string | null | undefined): Currency {
  const supported: Currency[] = ["USD", "INR", "EUR", "GBP"];
  const upper = (code ?? "USD").toUpperCase() as Currency;
  return supported.includes(upper) ? upper : "USD";
}

function normalizeDate(value: string): string {
  return value.slice(0, 10);
}
