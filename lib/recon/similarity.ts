import type { Candidate, LedgerEntry } from "./types";

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `Vector dimension mismatch: ${a.length} vs ${b.length}`
    );
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * In-process top-K search. Production reads use the pgvector ivfflat index
 * (see reconStore.searchCandidates); this is the fallback for the local store
 * and the reference implementation the SQL path is expected to agree with.
 */
export function rankCandidates(
  queryVector: number[],
  entries: LedgerEntry[],
  topK: number
): Candidate[] {
  const scored: Candidate[] = [];
  for (const entry of entries) {
    if (!entry.embedding) continue;
    scored.push({
      ledgerEntry: entry,
      score: cosineSimilarity(queryVector, entry.embedding),
    });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}
