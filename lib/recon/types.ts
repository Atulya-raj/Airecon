/**
 * ReconAI domain types.
 * Mirrors the SQL schema in db/recon/schema.sql (snake_case there, camelCase here).
 */

export type TransactionStatus =
  | "unmatched"
  | "auto_matched"
  | "reviewed"
  | "anomalous";

export type LedgerEntryType = "invoice" | "expense" | "refund";

export type MatchMethod = "embedding" | "rule" | "manual";

export type Currency = "USD" | "INR" | "EUR" | "GBP";

export interface Transaction {
  id: string;
  orgId: string;
  accountId: string;
  amount: number;
  currency: Currency;
  txnDate: string; // ISO date (YYYY-MM-DD)
  payeeRaw: string | null;
  memo: string | null;
  embedding: number[] | null;
  modelVersion: string | null;
  status: TransactionStatus;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  orgId: string;
  entryType: LedgerEntryType;
  amount: number;
  currency: Currency;
  vendorName: string | null;
  memo: string | null;
  entryDate: string;
  embedding: number[] | null;
  modelVersion: string | null;
  createdAt: string;
}

export interface Match {
  id: string;
  orgId: string;
  transactionId: string;
  ledgerEntryId: string | null;
  confidenceScore: number | null;
  matchMethod: MatchMethod;
  matchedBy: string; // user id or "system"
  rationale: string | null;
  createdAt: string;
}

export interface VendorPattern {
  id: string;
  orgId: string;
  vendorName: string;
  avgAmount: number;
  amountStddev: number;
  typicalIntervalDays: number;
  sampleSize: number;
  lastUpdated: string;
}

/** A ledger candidate ranked against a transaction by vector similarity. */
export interface Candidate {
  ledgerEntry: LedgerEntry;
  score: number;
}

export type ReconOutcome =
  | "auto_matched_embedding"
  | "auto_matched_rule"
  | "anomalous";

export interface ReconDecision {
  transactionId: string;
  outcome: ReconOutcome;
  candidates: Candidate[];
  match: Match | null;
  /** Human-readable explanation of why the decision was made. */
  rationale: string;
  anomalySignals: AnomalySignal[];
}

export interface AnomalySignal {
  kind: "no_confident_candidate" | "amount_zscore" | "interval_deviation";
  detail: string;
  severity: "low" | "medium" | "high";
}

/**
 * Per-org tuning. Never hardcoded in the pipeline so thresholds can adapt
 * per tenant (and per vendor via VendorPattern) without a model retrain.
 */
export interface ReconConfig {
  orgId: string;
  displayName?: string;
  baseCurrency?: Currency;
  fiscalYearStart?: string;
  autoMatchThreshold: number;
  ambiguousBandFloor: number;
  topK: number;
  /** Two candidates within this score delta are considered indistinguishable. */
  tieEpsilon: number;
  amountTolerancePct: number;
  amountToleranceFlat: number;
  dateWindowDays: number;
  /** z-score above which a vendor's amount is treated as anomalous. */
  anomalyZScoreThreshold: number;
  /** Interval deviation (in multiples of the typical interval) that flags an anomaly. */
  anomalyIntervalFactor: number;
  /** Confidence assigned when the rule engine resolves an ambiguous case. */
  ruleMatchConfidence: number;
}

export interface ReconciledFlow {
  date: string; // ISO date (YYYY-MM-DD)
  amount: number;
  type: "inflow" | "outflow";
  description: string;
}

export interface CashFlowPoint {
  date: string; // ISO date (YYYY-MM-DD)
  actualNet?: number;
  projectedNet?: number;
  lowerBound?: number;
  upperBound?: number;
  cumulativeNet: number;
}

export interface ForecastSummary {
  avgDailyInflow: number;
  avgDailyOutflow: number;
  netDailyBurnOrGrowth: number;
  projectedEndingCashDelta: number;
  confidenceLevel: number;
}

export interface ForecastResult {
  orgId: string;
  horizonDays: number;
  historicalPoints: CashFlowPoint[];
  projectedPoints: CashFlowPoint[];
  summary: ForecastSummary;
  generatedAt: string;
}
