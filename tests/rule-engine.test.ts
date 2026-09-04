import { describe, expect, it } from "vitest";
import { resolveConfig } from "@/lib/recon/config";
import { evaluateRules, sameVendor } from "@/lib/recon/rule-engine";
import type {
  Candidate,
  LedgerEntry,
  Transaction,
  VendorPattern,
} from "@/lib/recon/types";

const config = resolveConfig("org-1");

function txn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "t1",
    orgId: "org-1",
    accountId: "acct",
    amount: 2450,
    currency: "USD",
    txnDate: "2026-08-04",
    payeeRaw: "NORTHWIND TRADERS WIRE",
    memo: null,
    embedding: null,
    modelVersion: null,
    status: "unmatched",
    createdAt: "2026-08-04T00:00:00Z",
    ...overrides,
  };
}

function entry(overrides: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: "l1",
    orgId: "org-1",
    entryType: "invoice",
    amount: 2450,
    currency: "USD",
    vendorName: "Northwind Traders",
    memo: "Invoice #1092",
    entryDate: "2026-08-01",
    embedding: null,
    modelVersion: null,
    createdAt: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

function candidate(ledgerEntry: LedgerEntry, score: number): Candidate {
  return { ledgerEntry, score };
}

describe("rule engine", () => {
  it("resolves a fee-adjusted wire through amount tolerance and date window", () => {
    const result = evaluateRules({
      transaction: txn({ amount: 2438 }),
      candidates: [candidate(entry(), 0.81)],
      config,
      openLedgerEntries: [entry()],
      vendorPattern: null,
    });

    expect(result.resolved).toBe(true);
    expect(result.ledgerEntryIds).toEqual(["l1"]);
    expect(result.appliedRules).toContain("amount_tolerance");
  });

  it("leaves a tie unresolved when both candidates pass the tolerance rules", () => {
    const a = entry({ id: "l1" });
    const b = entry({ id: "l2", memo: "Invoice #1092 duplicate" });

    const result = evaluateRules({
      transaction: txn(),
      candidates: [candidate(a, 0.83), candidate(b, 0.82)],
      config,
      openLedgerEntries: [a, b],
      vendorPattern: null,
    });

    expect(result.resolved).toBe(false);
    expect(result.rationale).toMatch(/tie epsilon/);
  });

  it("reconstructs a batched deposit via the running-balance rule", () => {
    const first = entry({
      id: "l1",
      amount: 1200,
      vendorName: "Contoso Ltd",
      entryDate: "2026-08-05",
    });
    const second = entry({
      id: "l2",
      amount: 800,
      vendorName: "Contoso Ltd",
      entryDate: "2026-08-06",
    });

    const result = evaluateRules({
      transaction: txn({
        amount: 2000,
        payeeRaw: "CONTOSO LTD ACH DEPOSIT",
        txnDate: "2026-08-08",
      }),
      candidates: [candidate(first, 0.79)],
      config,
      openLedgerEntries: [first, second],
      vendorPattern: null,
    });

    expect(result.resolved).toBe(true);
    expect(result.ledgerEntryIds.sort()).toEqual(["l1", "l2"]);
    expect(result.appliedRules).toContain("running_balance");
  });

  it("boosts confidence for a recurring vendor within its historical spread", () => {
    const hosting = entry({
      id: "l9",
      amount: 240,
      vendorName: "Cloudspend Hosting",
      entryDate: "2026-08-07",
    });
    const pattern: VendorPattern = {
      id: "p1",
      orgId: "org-1",
      vendorName: "cloudspend hosting",
      avgAmount: 239.9,
      amountStddev: 1.35,
      typicalIntervalDays: 30,
      sampleSize: 3,
      lastUpdated: "2026-08-07T00:00:00Z",
    };

    const result = evaluateRules({
      transaction: txn({
        amount: 240,
        payeeRaw: "CLOUDSPEND HOSTING",
        txnDate: "2026-08-07",
      }),
      candidates: [candidate(hosting, 0.78)],
      config,
      openLedgerEntries: [hosting],
      vendorPattern: pattern,
    });

    expect(result.resolved).toBe(true);
    expect(result.appliedRules).toContain("recurring_vendor");
    expect(result.confidence).toBeGreaterThan(config.ruleMatchConfidence);
  });

  it("does not resolve when the candidate falls outside the date window", () => {
    const stale = entry({ entryDate: "2026-06-01" });
    const result = evaluateRules({
      transaction: txn(),
      candidates: [candidate(stale, 0.8)],
      config,
      openLedgerEntries: [stale],
      vendorPattern: null,
    });

    expect(result.resolved).toBe(false);
  });

  it("matches vendors across aggregator payee noise", () => {
    expect(
      sameVendor(txn({ payeeRaw: "AMZN MKTP US*2K3F9" }), entry({ vendorName: "Amazon" }))
    ).toBe(false);
    expect(
      sameVendor(
        txn({ payeeRaw: "NORTHWIND TRADERS WIRE XX1234" }),
        entry({ vendorName: "Northwind Traders" })
      )
    ).toBe(true);
  });
});
