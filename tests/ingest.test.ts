import { describe, expect, it } from "vitest";
import { normalizeBatch } from "@/lib/recon/ingest";

describe("bank ingestion adapter", () => {
  it("normalizes a Plaid batch into the common schema", () => {
    const [txn] = normalizeBatch("plaid", "org-1", [
      {
        transaction_id: "abc",
        account_id: "acct-1",
        amount: -2450,
        iso_currency_code: "usd",
        date: "2026-08-04T00:00:00Z",
        name: "NORTHWIND TRADERS WIRE",
        merchant_name: null,
        original_description: "WIRE IN REF 88213",
      },
    ]);

    expect(txn).toMatchObject({
      orgId: "org-1",
      externalId: "plaid:abc",
      amount: 2450,
      currency: "USD",
      txnDate: "2026-08-04",
      payeeRaw: "NORTHWIND TRADERS WIRE",
    });
  });

  it("skips pending transactions and duplicate ids", () => {
    const result = normalizeBatch("plaid", "org-1", [
      {
        transaction_id: "dup",
        account_id: "a",
        amount: 10,
        date: "2026-08-04",
        name: "X",
      },
      {
        transaction_id: "dup",
        account_id: "a",
        amount: 10,
        date: "2026-08-04",
        name: "X",
      },
      {
        transaction_id: "pending",
        account_id: "a",
        amount: 10,
        date: "2026-08-04",
        name: "Y",
        pending: true,
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].externalId).toBe("plaid:dup");
  });

  it("normalizes a Teller batch", () => {
    const [txn] = normalizeBatch("teller", "org-1", [
      {
        id: "t-1",
        account_id: "acct-2",
        amount: "-89.00",
        date: "2026-08-03",
        description: "AMZN MKTP US*2K3F9",
        details: { counterparty: { name: "Amazon" } },
      },
    ]);

    expect(txn).toMatchObject({
      externalId: "teller:t-1",
      amount: 89,
      payeeRaw: "Amazon",
      txnDate: "2026-08-03",
    });
  });

  it("rejects a payload missing required aggregator fields", () => {
    expect(() => normalizeBatch("plaid", "org-1", [{ account_id: "a" }])).toThrow();
  });
});
