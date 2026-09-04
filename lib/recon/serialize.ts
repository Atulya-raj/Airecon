import type { LedgerEntry, Transaction } from "./types";

/**
 * Both sides of the match are serialized identically so amount and date
 * contribute to the vector alongside the free-text payee/memo.
 */
export function serializeTransaction(txn: Transaction): string {
  return buildText(txn.amount, txn.txnDate, txn.payeeRaw, txn.memo);
}

export function serializeLedgerEntry(entry: LedgerEntry): string {
  return buildText(entry.amount, entry.entryDate, entry.vendorName, entry.memo);
}

function buildText(
  amount: number,
  date: string,
  party: string | null,
  memo: string | null
): string {
  return [amount.toFixed(2), date, normalizeParty(party), normalizeText(memo)]
    .filter((part) => part.length > 0)
    .join(" ");
}

/**
 * Strips the noise aggregators add to payee strings (card suffixes, store
 * numbers, transaction ids) so the same vendor serializes consistently.
 */
export function normalizeParty(value: string | null | undefined): string {
  if (!value) return "";
  return normalizeText(
    value
      .replace(/\b(?:x{2,}|\*{2,})\d+\b/gi, " ")
      .replace(/\b\d{6,}\b/g, " ")
      .replace(/\b(?:pos|ach|debit|credit|purchase|payment|pmt|ref|id)\b/gi, " ")
  );
}

export function normalizeText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Stable content hash used to skip re-embedding unchanged rows. */
export function sourceHash(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + c, 0x85ebca6b) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}
