import type { Currency } from "./types";
import type { NewLedgerEntry, NewTransaction } from "./store";

/**
 * A rich book of transactions and ledger entries exercising:
 * 1. Clean embedding cosine match
 * 2. Fee-adjusted international wire
 * 3. Batched customer deposits
 * 4. Multi-month recurring SaaS vendor pattern
 * 5. Sudden anomalous charge spike (10x normal)
 * 6. Multi-currency cross-border expenses (EUR, INR, GBP)
 */
export function demoLedgerEntries(orgId: string): NewLedgerEntry[] {
  return [
    entry(orgId, "invoice", 2450.0, "Northwind Traders", "Invoice #1092 - Consulting Retainer", "2026-08-01", "USD"),
    entry(orgId, "expense", 89.0, "Amazon", "Office supplies & desk accessories", "2026-08-03", "USD"),
    entry(orgId, "invoice", 1200.0, "Contoso Ltd", "Invoice #1093 - Q3 Maintenance", "2026-08-05", "USD"),
    entry(orgId, "invoice", 800.0, "Contoso Ltd", "Invoice #1094 - Feature Addon", "2026-08-06", "USD"),
    entry(orgId, "expense", 240.0, "Cloudspend Hosting", "Monthly Cloud Server Cluster", "2026-08-07", "USD"),
    entry(orgId, "refund", 45.0, "Amazon", "Returned monitor arm mount", "2026-08-09", "USD"),
    entry(orgId, "invoice", 1850.0, "EuroTech Solutions", "INV-EU-884 Dev Retainer", "2026-08-10", "EUR"),
    entry(orgId, "expense", 72500.0, "Razorpay Tech Services", "Bangalore Office Infrastructure", "2026-08-12", "INR"),
    entry(orgId, "expense", 420.0, "Figma Inc", "Annual Design Org License", "2026-08-14", "USD"),
  ];
}

export function demoTransactions(orgId: string): NewTransaction[] {
  return [
    txn(orgId, 2438.0, "2026-08-04", "NORTHWIND TRADERS WIRE", "WIRE IN REF 88213 - LESS $12 WIRE FEE", "d-1", "USD"),
    txn(orgId, 89.0, "2026-08-03", "AMZN MKTP US*2K3F9", "PURCHASE SEATTLE WA", "d-2", "USD"),
    txn(orgId, 2000.0, "2026-08-08", "CONTOSO LTD ACH DEPOSIT", "BATCH ACH DEPOSIT (INV 1093 + 1094)", "d-3", "USD"),
    txn(orgId, 240.0, "2026-08-07", "CLOUDSPEND HOSTING", "RECURRING SVCS PORTLAND OR", "d-4", "USD"),
    txn(orgId, 9800.0, "2026-08-10", "CLOUDSPEND HOSTING", "UNEXPECTED GPU SPIKE CHARGE", "d-5", "USD"),
    txn(orgId, 512.35, "2026-08-11", "UNKNOWN VENDOR LLC", "POS TERMINAL 1123 AUSTIN TX", "d-6", "USD"),
    txn(orgId, 1850.0, "2026-08-11", "EUROTECH SOLUTIONS BERLIN", "SEPA CREDIT TRANSFER", "d-7", "EUR"),
    txn(orgId, 72500.0, "2026-08-13", "RAZORPAY BANGALORE IN", "NEFT BUSINESS TRANSFER", "d-8", "INR"),
    txn(orgId, 420.0, "2026-08-15", "FIGMA DESIGN TOOLS", "FIGMA SUBSCRIPTION SAN FRANCISCO CA", "d-9", "USD"),
  ];
}

/** Prior activity that gives recurring-vendor rules baselines to work from. */
export function demoVendorHistory(orgId: string): NewTransaction[] {
  return [
    txn(orgId, 240.0, "2026-05-07", "CLOUDSPEND HOSTING", "RECURRING SVCS", "h-1", "USD", "reviewed"),
    txn(orgId, 238.5, "2026-06-07", "CLOUDSPEND HOSTING", "RECURRING SVCS", "h-2", "USD", "reviewed"),
    txn(orgId, 241.2, "2026-07-07", "CLOUDSPEND HOSTING", "RECURRING SVCS", "h-3", "USD", "reviewed"),
    txn(orgId, 420.0, "2025-08-15", "FIGMA DESIGN TOOLS", "FIGMA ANNUAL", "h-4", "USD", "reviewed"),
  ];
}

function entry(
  orgId: string,
  entryType: NewLedgerEntry["entryType"],
  amount: number,
  vendorName: string,
  memo: string,
  entryDate: string,
  currency: Currency = "USD"
): NewLedgerEntry {
  return {
    orgId,
    entryType,
    amount,
    currency,
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
  currency: Currency = "USD",
  status: NewTransaction["status"] = "unmatched"
): NewTransaction {
  return {
    orgId,
    accountId: "demo-account",
    externalId: `demo:${externalId}`,
    amount,
    currency,
    txnDate,
    payeeRaw,
    memo,
    status,
  };
}

