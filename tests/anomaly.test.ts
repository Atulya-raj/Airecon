import { describe, expect, it } from "vitest";
import { amountZScore, computeVendorPattern, detectAnomalies } from "@/lib/recon/anomaly";
import { resolveConfig } from "@/lib/recon/config";
import type { Transaction, VendorPattern } from "@/lib/recon/types";

const config = resolveConfig("org-1");

const history: Pick<Transaction, "amount" | "txnDate">[] = [
  { amount: 240, txnDate: "2026-05-07" },
  { amount: 238.5, txnDate: "2026-06-07" },
  { amount: 241.2, txnDate: "2026-07-07" },
];

function transaction(amount: number, txnDate = "2026-08-07"): Transaction {
  return {
    id: "t1",
    orgId: "org-1",
    accountId: "acct",
    amount,
    currency: "USD",
    txnDate,
    payeeRaw: "CLOUDSPEND HOSTING",
    memo: null,
    embedding: null,
    modelVersion: null,
    status: "unmatched",
    createdAt: "2026-08-07T00:00:00Z",
  };
}

describe("vendor baselines", () => {
  it("derives average, spread, and cadence from history", () => {
    const pattern = computeVendorPattern("org-1", "cloudspend hosting", history);
    expect(pattern.avgAmount).toBeCloseTo(239.9, 1);
    expect(pattern.amountStddev).toBeGreaterThan(0);
    expect(pattern.typicalIntervalDays).toBeCloseTo(30.5, 0);
    expect(pattern.sampleSize).toBe(3);
  });

  it("reports no z-score for a vendor with zero spread and a differing amount", () => {
    const flat: VendorPattern = {
      id: "p",
      orgId: "org-1",
      vendorName: "v",
      avgAmount: 100,
      amountStddev: 0,
      typicalIntervalDays: 30,
      sampleSize: 5,
      lastUpdated: "2026-08-01T00:00:00Z",
    };
    expect(amountZScore(100, flat)).toBe(0);
    expect(amountZScore(500, flat)).toBeNull();
  });
});

describe("anomaly detection", () => {
  const pattern: VendorPattern = {
    id: "p",
    ...computeVendorPattern("org-1", "cloudspend hosting", history),
  };

  it("flags a transaction with no candidate above the band floor", () => {
    const signals = detectAnomalies({
      transaction: transaction(240),
      candidates: [],
      config,
      vendorPattern: pattern,
      lastSeenDate: "2026-07-07",
    });
    expect(signals[0].kind).toBe("no_confident_candidate");
    expect(signals[0].severity).toBe("high");
  });

  it("flags an amount far outside the vendor baseline even with a decent candidate", () => {
    const signals = detectAnomalies({
      transaction: transaction(9800),
      candidates: [
        {
          ledgerEntry: {
            id: "l1",
            orgId: "org-1",
            entryType: "expense",
            amount: 240,
            currency: "USD",
            vendorName: "Cloudspend Hosting",
            memo: null,
            entryDate: "2026-08-07",
            embedding: null,
            modelVersion: null,
            createdAt: "2026-08-07T00:00:00Z",
          },
          score: 0.9,
        },
      ],
      config,
      vendorPattern: pattern,
      lastSeenDate: "2026-07-07",
    });

    expect(signals.map((s) => s.kind)).toContain("amount_zscore");
  });

  it("stays quiet for a normal recurring charge", () => {
    const signals = detectAnomalies({
      transaction: transaction(240),
      candidates: [
        {
          ledgerEntry: {
            id: "l1",
            orgId: "org-1",
            entryType: "expense",
            amount: 240,
            currency: "USD",
            vendorName: "Cloudspend Hosting",
            memo: null,
            entryDate: "2026-08-07",
            embedding: null,
            modelVersion: null,
            createdAt: "2026-08-07T00:00:00Z",
          },
          score: 0.95,
        },
      ],
      config,
      vendorPattern: pattern,
      lastSeenDate: "2026-07-07",
    });

    expect(signals).toHaveLength(0);
  });
});
