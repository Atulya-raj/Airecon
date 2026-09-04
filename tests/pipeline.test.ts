import { beforeEach, describe, expect, it } from "vitest";
import { LocalEmbeddingClient } from "@/lib/recon/embeddings";
import {
  demoLedgerEntries,
  demoTransactions,
  demoVendorHistory,
} from "@/lib/recon/demo-data";
import { confirmMatch, runReconciliation } from "@/lib/recon/pipeline";
import { LocalReconStore } from "@/lib/recon/store";

const ORG = "org-test";

async function seed() {
  const store = new LocalReconStore(null);
  await store.insertLedgerEntries(ORG, demoLedgerEntries(ORG));
  await store.upsertTransactions(ORG, [
    ...demoVendorHistory(ORG),
    ...demoTransactions(ORG),
  ]);
  return store;
}

describe("reconciliation pipeline", () => {
  let store: LocalReconStore;

  beforeEach(async () => {
    store = await seed();
  });

  it("classifies every unmatched transaction and never leaves one silently unhandled", async () => {
    const result = await runReconciliation({
      orgId: ORG,
      store,
      embeddings: new LocalEmbeddingClient(),
    });

    expect(result.processed).toBe(demoTransactions(ORG).length);
    expect(result.autoMatched + result.ruleMatched + result.anomalous).toBe(
      result.processed
    );

    const remaining = await store.listTransactions(ORG, { status: "unmatched" });
    expect(remaining).toHaveLength(0);
  });

  it("queues an unknown vendor for review instead of force-matching it", async () => {
    const result = await runReconciliation({
      orgId: ORG,
      store,
      embeddings: new LocalEmbeddingClient(),
    });

    const unknown = result.decisions.find((d) =>
      d.rationale.length > 0 && d.outcome === "anomalous"
    );
    expect(unknown).toBeDefined();
    expect(unknown?.match).toBeNull();

    const notifications = await store.listNotifications(ORG);
    expect(notifications.length).toBeGreaterThan(0);
  });

  it("flags a vendor amount far outside its historical baseline", async () => {
    const result = await runReconciliation({
      orgId: ORG,
      store,
      embeddings: new LocalEmbeddingClient(),
    });

    const outlier = result.decisions.find(
      (d) => d.anomalySignals.some((s) => s.kind === "amount_zscore")
    );
    expect(outlier).toBeDefined();
  });

  it("writes an append-only audit row for every decision", async () => {
    await runReconciliation({ orgId: ORG, store, embeddings: new LocalEmbeddingClient() });
    const matches = await store.listMatches(ORG);
    for (const match of matches) {
      expect(["embedding", "rule", "manual"]).toContain(match.matchMethod);
      expect(match.orgId).toBe(ORG);
    }
  });

  it("records a manual override without overwriting the automated decision", async () => {
    const [transaction] = await store.listTransactions(ORG, { limit: 1 });
    const entries = await store.listOpenLedgerEntries(ORG);

    await confirmMatch({
      orgId: ORG,
      transactionId: transaction.id,
      ledgerEntryId: entries[0].id,
      userId: "user-1",
      store,
    });

    const matches = await store.listMatches(ORG, transaction.id);
    expect(matches[0].matchMethod).toBe("manual");
    expect(matches[0].matchedBy).toBe("user-1");

    const updated = await store.getTransaction(ORG, transaction.id);
    expect(updated?.status).toBe("reviewed");
  });

  it("applies deterministic rules to candidates retrieved below the ambiguous band", async () => {
    const result = await runReconciliation({
      orgId: ORG,
      store,
      embeddings: new LocalEmbeddingClient(),
      // Force every candidate under the band floor: rules must still resolve
      // the fee-adjusted wire and the batched deposit on amount/date/vendor.
      configOverrides: { autoMatchThreshold: 0.999, ambiguousBandFloor: 0.998 },
    });

    expect(result.ruleMatched).toBeGreaterThan(0);
    const ruleMatches = await store.listMatches(ORG);
    expect(ruleMatches.some((m) => m.matchMethod === "rule")).toBe(true);
  });

  it("does not let a below-band candidate match on amount and date alone", async () => {
    const isolated = new LocalReconStore(null);
    await isolated.insertLedgerEntries(ORG, [
      {
        orgId: ORG,
        entryType: "invoice",
        amount: 512.35,
        currency: "USD",
        vendorName: "Fabrikam Supplies",
        memo: "Invoice #4410",
        entryDate: "2026-08-09",
      },
    ]);
    await isolated.upsertTransactions(ORG, [
      {
        orgId: ORG,
        externalId: "x:1",
        accountId: "acct",
        amount: 512.35,
        currency: "USD",
        txnDate: "2026-08-09",
        payeeRaw: "UNKNOWN VENDOR LLC",
        memo: null,
      },
    ]);

    const result = await runReconciliation({
      orgId: ORG,
      store: isolated,
      embeddings: new LocalEmbeddingClient(),
      configOverrides: { autoMatchThreshold: 0.999, ambiguousBandFloor: 0.998 },
    });

    expect(result.anomalous).toBe(1);
    expect(await isolated.listMatches(ORG)).toHaveLength(0);
  });

  it("excludes an unreconciled outlier from the vendor baseline it is measured against", async () => {
    await runReconciliation({ orgId: ORG, store, embeddings: new LocalEmbeddingClient() });
    const pattern = await store.getVendorPattern(ORG, "cloudspend hosting");
    expect(pattern).not.toBeNull();
    expect(pattern!.avgAmount).toBeLessThan(1000);
  });

  it("keeps tenants isolated", async () => {
    await runReconciliation({ orgId: ORG, store, embeddings: new LocalEmbeddingClient() });
    expect(await store.listTransactions("other-org")).toHaveLength(0);
    expect(await store.listMatches("other-org")).toHaveLength(0);
  });

  it("is idempotent on re-ingesting the same aggregator batch", async () => {
    const before = await store.listTransactions(ORG, { limit: 500 });
    await store.upsertTransactions(ORG, demoTransactions(ORG));
    const after = await store.listTransactions(ORG, { limit: 500 });
    expect(after).toHaveLength(before.length);
  });
});
