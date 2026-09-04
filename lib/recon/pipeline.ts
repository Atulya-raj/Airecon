import { computeVendorPattern, detectAnomalies, vendorKey } from "./anomaly";
import { getEmbeddingClient, type EmbeddingClient } from "./embeddings";
import { evaluateRules } from "./rule-engine";
import {
  serializeLedgerEntry,
  serializeTransaction,
  sourceHash,
} from "./serialize";
import { rankCandidates } from "./similarity";
import { getReconStore, type ReconStore } from "./store";
import type {
  Candidate,
  LedgerEntry,
  Match,
  ReconConfig,
  ReconDecision,
  Transaction,
} from "./types";

export interface ReconcileOptions {
  orgId: string;
  /** Restrict the run to specific transactions; defaults to all unmatched. */
  transactionIds?: string[];
  limit?: number;
  store?: ReconStore;
  embeddings?: EmbeddingClient;
  configOverrides?: Partial<ReconConfig>;
}

export interface ReconcileRunResult {
  orgId: string;
  processed: number;
  autoMatched: number;
  ruleMatched: number;
  anomalous: number;
  decisions: ReconDecision[];
}

/**
 * End-to-end match pipeline: embed → top-K similarity → threshold branch →
 * deterministic rules → match or anomaly queue.
 * Every outcome writes an append-only row to `matches` or a queued anomaly;
 * nothing is silently dropped.
 */
export async function runReconciliation(
  options: ReconcileOptions
): Promise<ReconcileRunResult> {
  const store = options.store ?? getReconStore();
  const embeddings = options.embeddings ?? getEmbeddingClient();
  const baseConfig = await store.getConfig(options.orgId);
  const config: ReconConfig = { ...baseConfig, ...options.configOverrides };

  const transactions = await selectTransactions(store, options);
  await ensureLedgerEmbeddings(store, embeddings, options.orgId);

  const decisions: ReconDecision[] = [];
  for (const transaction of transactions) {
    decisions.push(
      await reconcileTransaction({ transaction, store, embeddings, config })
    );
  }

  return {
    orgId: options.orgId,
    processed: decisions.length,
    autoMatched: decisions.filter((d) => d.outcome === "auto_matched_embedding").length,
    ruleMatched: decisions.filter((d) => d.outcome === "auto_matched_rule").length,
    anomalous: decisions.filter((d) => d.outcome === "anomalous").length,
    decisions,
  };
}

interface ReconcileTransactionArgs {
  transaction: Transaction;
  store: ReconStore;
  embeddings: EmbeddingClient;
  config: ReconConfig;
}

export async function reconcileTransaction({
  transaction,
  store,
  embeddings,
  config,
}: ReconcileTransactionArgs): Promise<ReconDecision> {
  const vector = await ensureTransactionEmbedding(store, embeddings, transaction);
  const candidates = await findCandidates(store, transaction.orgId, vector, config.topK);
  const pattern = await refreshVendorPattern(store, transaction);

  const best = candidates[0];

  if (best && best.score >= config.autoMatchThreshold) {
    const match = await writeMatch(store, {
      transaction,
      ledgerEntryId: best.ledgerEntry.id,
      confidenceScore: best.score,
      matchMethod: "embedding",
      rationale: `Cosine similarity ${best.score.toFixed(3)} ≥ auto-match threshold ${config.autoMatchThreshold}`,
    });
    return {
      transactionId: transaction.id,
      outcome: "auto_matched_embedding",
      candidates,
      match,
      rationale: match.rationale ?? "",
      anomalySignals: [],
    };
  }

  // Rules run for everything that did not auto-match, not just the ambiguous
  // band: below the floor the similarity score is uninformative, but amount,
  // date and vendor agreement still are. Below-band candidates additionally
  // have to agree on the party so arithmetic coincidence cannot resolve them.
  const inAmbiguousBand = best !== undefined && best.score >= config.ambiguousBandFloor;
  {
    const openLedgerEntries = await store.listOpenLedgerEntries(transaction.orgId);
    const evaluation = evaluateRules({
      transaction,
      candidates,
      config,
      openLedgerEntries,
      vendorPattern: pattern,
      requireVendorMatch: !inAmbiguousBand,
    });

    if (evaluation.resolved) {
      let match: Match | null = null;
      // Split/batched payments produce one append-only row per ledger entry.
      for (const ledgerEntryId of evaluation.ledgerEntryIds) {
        match = await writeMatch(store, {
          transaction,
          ledgerEntryId,
          confidenceScore: evaluation.confidence,
          matchMethod: "rule",
          rationale: `${evaluation.rationale} [rules: ${evaluation.appliedRules.join(", ")}]`,
        });
      }
      return {
        transactionId: transaction.id,
        outcome: "auto_matched_rule",
        candidates,
        match,
        rationale: evaluation.rationale,
        anomalySignals: [],
      };
    }
  }

  const history = await store.listVendorHistory(
    transaction.orgId,
    vendorKey(transaction.payeeRaw)
  );
  const previous = history
    .filter((t) => t.id !== transaction.id && t.txnDate < transaction.txnDate)
    .sort((a, b) => b.txnDate.localeCompare(a.txnDate))[0];

  const signals = detectAnomalies({
    transaction,
    candidates,
    config,
    vendorPattern: pattern,
    lastSeenDate: previous?.txnDate ?? null,
  });

  await store.setTransactionStatus(transaction.orgId, transaction.id, "anomalous");
  const rationale =
    signals.length > 0
      ? signals.map((s) => s.detail).join("; ")
      : "No candidate cleared the auto-match threshold and no rule resolved the match";
  await store.insertNotification({
    orgId: transaction.orgId,
    kind: inAmbiguousBand ? "low_confidence" : "anomaly",
    transactionId: transaction.id,
    message: `${transaction.payeeRaw ?? "Transaction"} ${transaction.amount.toFixed(
      2
    )} on ${transaction.txnDate} needs review — ${rationale}`,
  });

  return {
    transactionId: transaction.id,
    outcome: "anomalous",
    candidates,
    match: null,
    rationale,
    anomalySignals: signals,
  };
}

/** Records a bookkeeper's decision. Manual matches are the training signal. */
export async function confirmMatch(args: {
  orgId: string;
  transactionId: string;
  ledgerEntryId: string | null;
  userId: string;
  note?: string;
  store?: ReconStore;
}): Promise<Match> {
  const store = args.store ?? getReconStore();
  const transaction = await store.getTransaction(args.orgId, args.transactionId);
  if (!transaction) throw new Error("Transaction not found");

  if (args.ledgerEntryId) {
    const entry = await store.getLedgerEntry(args.orgId, args.ledgerEntryId);
    if (!entry) throw new Error("Ledger entry not found");
  }

  const match = await store.insertMatch({
    orgId: args.orgId,
    transactionId: args.transactionId,
    ledgerEntryId: args.ledgerEntryId,
    confidenceScore: null,
    matchMethod: "manual",
    matchedBy: args.userId,
    rationale: args.note ?? "Manual review",
  });
  await store.setTransactionStatus(args.orgId, args.transactionId, "reviewed");
  return match;
}

export async function getCandidatesForReview(args: {
  orgId: string;
  transactionId: string;
  store?: ReconStore;
  embeddings?: EmbeddingClient;
}): Promise<{ transaction: Transaction; candidates: Candidate[] }> {
  const store = args.store ?? getReconStore();
  const embeddings = args.embeddings ?? getEmbeddingClient();
  const transaction = await store.getTransaction(args.orgId, args.transactionId);
  if (!transaction) throw new Error("Transaction not found");

  const config = await store.getConfig(args.orgId);
  const vector = await ensureTransactionEmbedding(store, embeddings, transaction);
  await ensureLedgerEmbeddings(store, embeddings, args.orgId);
  const candidates = await findCandidates(store, args.orgId, vector, config.topK);
  return { transaction, candidates };
}

async function selectTransactions(
  store: ReconStore,
  options: ReconcileOptions
): Promise<Transaction[]> {
  if (options.transactionIds && options.transactionIds.length > 0) {
    const found = await Promise.all(
      options.transactionIds.map((id) => store.getTransaction(options.orgId, id))
    );
    return found.filter((t): t is Transaction => t !== null);
  }
  return store.listTransactions(options.orgId, {
    status: "unmatched",
    limit: options.limit ?? 100,
  });
}

async function findCandidates(
  store: ReconStore,
  orgId: string,
  vector: number[],
  topK: number
): Promise<Candidate[]> {
  if (store.searchCandidates) {
    return store.searchCandidates(orgId, vector, topK);
  }
  const open = await store.listOpenLedgerEntries(orgId);
  return rankCandidates(vector, open, topK);
}

async function ensureTransactionEmbedding(
  store: ReconStore,
  embeddings: EmbeddingClient,
  transaction: Transaction
): Promise<number[]> {
  if (transaction.embedding) return transaction.embedding;
  const text = serializeTransaction(transaction);
  const [result] = await embeddings.embed([text]);
  await store.setTransactionEmbedding(
    transaction.orgId,
    transaction.id,
    result.vector,
    result.modelVersion,
    sourceHash(text)
  );
  transaction.embedding = result.vector;
  transaction.modelVersion = result.modelVersion;
  return result.vector;
}

/** Embeds only entries missing a vector — an already-embedded row is never re-sent. */
async function ensureLedgerEmbeddings(
  store: ReconStore,
  embeddings: EmbeddingClient,
  orgId: string
): Promise<void> {
  const open = await store.listOpenLedgerEntries(orgId);
  const pending: LedgerEntry[] = open.filter((entry) => !entry.embedding);
  if (pending.length === 0) return;

  const texts = pending.map(serializeLedgerEntry);
  const results = await embeddings.embed(texts);
  await Promise.all(
    pending.map((entry, i) =>
      store.setLedgerEmbedding(
        orgId,
        entry.id,
        results[i].vector,
        results[i].modelVersion,
        sourceHash(texts[i])
      )
    )
  );
}

async function refreshVendorPattern(store: ReconStore, transaction: Transaction) {
  const key = vendorKey(transaction.payeeRaw);
  if (!key) return null;
  const history = await store.listVendorHistory(transaction.orgId, key);
  // Only reconciled transactions form the baseline. An unreviewed outlier in
  // the same run would otherwise widen the spread it is measured against, and
  // the vendor would start accepting almost any amount.
  const priorHistory = history.filter(
    (t) =>
      t.id !== transaction.id &&
      (t.status === "auto_matched" || t.status === "reviewed")
  );
  if (priorHistory.length === 0) return store.getVendorPattern(transaction.orgId, key);
  return store.upsertVendorPattern(
    computeVendorPattern(transaction.orgId, key, priorHistory)
  );
}

async function writeMatch(
  store: ReconStore,
  args: {
    transaction: Transaction;
    ledgerEntryId: string;
    confidenceScore: number;
    matchMethod: "embedding" | "rule";
    rationale: string;
  }
): Promise<Match> {
  const match = await store.insertMatch({
    orgId: args.transaction.orgId,
    transactionId: args.transaction.id,
    ledgerEntryId: args.ledgerEntryId,
    confidenceScore: args.confidenceScore,
    matchMethod: args.matchMethod,
    matchedBy: "system",
    rationale: args.rationale,
  });
  await store.setTransactionStatus(
    args.transaction.orgId,
    args.transaction.id,
    "auto_matched"
  );
  return match;
}
