import { describe, expect, it, vi } from "vitest";
import {
  CachingEmbeddingClient,
  EMBEDDING_DIMENSIONS,
  LocalEmbeddingClient,
  ResilientEmbeddingClient,
  type EmbeddingClient,
} from "@/lib/recon/embeddings";
import { normalizeParty, serializeTransaction } from "@/lib/recon/serialize";
import { cosineSimilarity, rankCandidates } from "@/lib/recon/similarity";
import type { LedgerEntry, Transaction } from "@/lib/recon/types";

const local = new LocalEmbeddingClient();

describe("serialization", () => {
  it("includes amount and date alongside the free text", () => {
    const transaction: Transaction = {
      id: "t",
      orgId: "o",
      accountId: "a",
      amount: 2450,
      currency: "USD",
      txnDate: "2026-08-04",
      payeeRaw: "NORTHWIND TRADERS WIRE",
      memo: "WIRE IN REF 88213",
      embedding: null,
      modelVersion: null,
      status: "unmatched",
      createdAt: "2026-08-04T00:00:00Z",
    };
    expect(serializeTransaction(transaction)).toBe(
      "2450.00 2026-08-04 northwind traders wire wire in ref 88213"
    );
  });

  it("strips card suffixes and store numbers from payee strings", () => {
    expect(normalizeParty("AMZN MKTP US*2K3F9 XX4412")).toBe("amzn mktp us 2k3f9");
  });
});

describe("similarity", () => {
  it("scores identical text higher than unrelated text", async () => {
    const [a, b, c] = await local.embed([
      "2450.00 2026-08-01 northwind traders invoice 1092",
      "2450.00 2026-08-04 northwind traders wire",
      "89.00 2026-08-03 amzn mktp office supplies",
    ]);
    expect(cosineSimilarity(a.vector, b.vector)).toBeGreaterThan(
      cosineSimilarity(a.vector, c.vector)
    );
  });

  it("rejects mismatched dimensions", () => {
    expect(() => cosineSimilarity([1, 0], [1, 0, 0])).toThrow(/dimension mismatch/);
  });

  it("ranks and truncates candidates, skipping entries without a vector", async () => {
    const [query, first] = await local.embed(["northwind traders", "northwind traders"]);
    const entries: LedgerEntry[] = [
      ledger("l1", first.vector),
      ledger("l2", null),
      ledger("l3", new Array(EMBEDDING_DIMENSIONS).fill(0)),
    ];
    const ranked = rankCandidates(query.vector, entries, 2);
    expect(ranked).toHaveLength(2);
    expect(ranked[0].ledgerEntry.id).toBe("l1");
  });
});

describe("embedding clients", () => {
  it("dedupes repeated texts before calling the model", async () => {
    const inner: EmbeddingClient = {
      embed: vi.fn(async (texts: string[]) =>
        texts.map(() => ({ vector: [1, 0, 0], modelVersion: "test" }))
      ),
    };
    const client = new CachingEmbeddingClient(inner);

    await client.embed(["a", "a", "b"]);
    await client.embed(["b"]);

    expect(inner.embed).toHaveBeenCalledTimes(1);
    expect(vi.mocked(inner.embed).mock.calls[0][0]).toEqual(["a", "b"]);
  });

  it("falls back to the local embedder when the service is unavailable", async () => {
    const failing: EmbeddingClient = {
      embed: async () => {
        throw new Error("service down");
      },
    };
    const client = new ResilientEmbeddingClient(failing, local);
    const [result] = await client.embed(["northwind"]);
    expect(result.vector).toHaveLength(EMBEDDING_DIMENSIONS);
    expect(result.modelVersion).toBe("local-hash-v1");
  });
});

function ledger(id: string, embedding: number[] | null): LedgerEntry {
  return {
    id,
    orgId: "o",
    entryType: "invoice",
    amount: 100,
    currency: "USD",
    vendorName: "Northwind Traders",
    memo: null,
    entryDate: "2026-08-01",
    embedding,
    modelVersion: null,
    createdAt: "2026-08-01T00:00:00Z",
  };
}
