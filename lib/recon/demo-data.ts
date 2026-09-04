import type { NewLedgerEntry, NewTransaction } from "./store";

/**
 * A small book that exercises each path of the pipeline: a clean match, a
 * fee-adjusted wire, a batched deposit, a recurring vendor, and an outlier.
 */
export function demoLedgerEntries(orgId: string): NewLedgerEntry[] {
  return [
    entry(orgId, "invoice", 2450.0, "Northwind Traders", "Invoice #1092", "2026-08-01"),
    entry(orgId, "expense", 89.0, "Amazon", "Office supplies", "2026-08-03"),
    entry(orgId, "invoice", 1200.0, "Contoso Ltd", "Invoice #1093", "2026-08-05"),
    entry(orgId, "invoice", 800.0, "Contoso Ltd", "Invoice #1094", "2026-08-06"),
    entry(orgId, "expense", 240.0, "Cloudspend Hosting", "Monthly hosting", "2026-08-07"),
    entry(orgId, "refund", 45.0, "Amazon", "Returned monitor stand", "2026-08-09"),
  ];
}

export function demoTransactions(orgId: string): NewTransaction[] {
  return [
    txn(orgId, 2438.0, "2026-08-04", "NORTHWIND TRADERS WIRE", "WIRE IN REF 88213", "d-1"),
    txn(orgId, 89.0, "2026-08-03", "AMZN MKTP US*2K3F9", "PURCHASE", "d-2"),
    txn(orgId, 2000.0, "2026-08-08", "CONTOSO LTD ACH DEPOSIT", "BATCH DEPOSIT", "d-3"),
    txn(orgId, 240.0, "2026-08-07", "CLOUDSPEND HOSTING", "RECURRING", "d-4"),
    txn(orgId, 9800.0, "2026-08-10", "CLOUDSPEND HOSTING", "RECURRING", "d-5"),
    txn(orgId, 512.35, "2026-08-11", "UNKNOWN VENDOR LLC", "POS 1123", "d-6"),
  ];
}

/** Prior activity that gives the recurring-vendor rule a baseline to work from. */
export function demoVendorHistory(orgId: string): NewTransaction[] {
  return [
    txn(orgId, 240.0, "2026-05-07", "CLOUDSPEND HOSTING", "RECURRING", "h-1", "reviewed"),
    txn(orgId, 238.5, "2026-06-07", "CLOUDSPEND HOSTING", "RECURRING", "h-2", "reviewed"),
    txn(orgId, 241.2, "2026-07-07", "CLOUDSPEND HOSTING", "RECURRING", "h-3", "reviewed"),
  ];
}

function entry(
  orgId: string,
  entryType: NewLedgerEntry["entryType"],
  amount: number,
  vendorName: string,
  memo: string,
  entryDate: string
): NewLedgerEntry {
  return {
    orgId,
    entryType,
    amount,
    currency: "USD",
    vendorName,
    memo,
    entryDate,
  };
}

function txn(
  orgId: string,
  amount: number,
  txnDate: string,
  payeeRaw: string,
  memo: string,
  externalId: string,
  status: NewTransaction["status"] = "unmatched"
): NewTransaction {
  return {
    orgId,
    accountId: "demo-account",
    externalId: `demo:${externalId}`,
    amount,
    currency: "USD",
    txnDate,
    payeeRaw,
    memo,
    status,
  };
}
