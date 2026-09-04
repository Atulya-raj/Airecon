import { normalizeParty } from "./serialize";
import { daysBetween } from "./rule-engine";
import type {
  AnomalySignal,
  Candidate,
  ReconConfig,
  Transaction,
  VendorPattern,
} from "./types";

/**
 * Recomputes a vendor's baseline from its historical transactions.
 * Runs after reconciliation so the baseline reflects confirmed activity.
 */
export function computeVendorPattern(
  orgId: string,
  vendorName: string,
  history: Pick<Transaction, "amount" | "txnDate">[]
): Omit<VendorPattern, "id"> {
  const amounts = history.map((t) => Math.abs(t.amount));
  const avgAmount = mean(amounts);
  const dates = history
    .map((t) => Date.parse(`${t.txnDate}T00:00:00Z`))
    .sort((a, b) => a - b);

  const intervals: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    intervals.push((dates[i] - dates[i - 1]) / 86_400_000);
  }

  return {
    orgId,
    vendorName,
    avgAmount,
    amountStddev: stddev(amounts, avgAmount),
    typicalIntervalDays: intervals.length > 0 ? median(intervals) : 0,
    sampleSize: history.length,
    lastUpdated: new Date().toISOString(),
  };
}

export interface AnomalyInput {
  transaction: Transaction;
  candidates: Candidate[];
  config: ReconConfig;
  vendorPattern: VendorPattern | null;
  /** Date of the vendor's previous transaction, if known. */
  lastSeenDate: string | null;
}

/**
 * Two independent signals decide the anomaly path: no candidate cleared the
 * ambiguous band, and statistical deviation from the vendor's own baseline.
 * Anomalies are always queued for review — never force-matched.
 */
export function detectAnomalies(input: AnomalyInput): AnomalySignal[] {
  const { transaction, candidates, config, vendorPattern, lastSeenDate } = input;
  const signals: AnomalySignal[] = [];

  const bestScore = candidates[0]?.score ?? 0;
  if (bestScore < config.ambiguousBandFloor) {
    signals.push({
      kind: "no_confident_candidate",
      detail: `Best candidate scored ${bestScore.toFixed(3)}, below the ambiguous band floor ${config.ambiguousBandFloor}`,
      severity: candidates.length === 0 ? "high" : "medium",
    });
  }

  if (vendorPattern && vendorPattern.sampleSize >= 3) {
    const z = amountZScore(Math.abs(transaction.amount), vendorPattern);
    if (z !== null && z >= config.anomalyZScoreThreshold) {
      signals.push({
        kind: "amount_zscore",
        detail: `Amount ${Math.abs(transaction.amount).toFixed(2)} is ${z.toFixed(
          1
        )}σ from the ${vendorPattern.vendorName} baseline (avg ${vendorPattern.avgAmount.toFixed(2)})`,
        severity: z >= config.anomalyZScoreThreshold * 2 ? "high" : "medium",
      });
    }

    if (lastSeenDate && vendorPattern.typicalIntervalDays > 0) {
      const gap = daysBetween(transaction.txnDate, lastSeenDate);
      const factor = gap / vendorPattern.typicalIntervalDays;
      if (factor >= config.anomalyIntervalFactor || factor <= 1 / config.anomalyIntervalFactor) {
        signals.push({
          kind: "interval_deviation",
          detail: `Charged after ${gap.toFixed(0)} days vs a typical ${vendorPattern.typicalIntervalDays.toFixed(
            0
          )}-day cadence`,
          severity: "low",
        });
      }
    }
  }

  return signals;
}

export function amountZScore(amount: number, pattern: VendorPattern): number | null {
  if (pattern.amountStddev <= 0) {
    return amount === pattern.avgAmount ? 0 : null;
  }
  return Math.abs(amount - pattern.avgAmount) / pattern.amountStddev;
}

export function vendorKey(name: string | null): string {
  return normalizeParty(name);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stddev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}
