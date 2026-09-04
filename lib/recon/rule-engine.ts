import { normalizeParty } from "./serialize";
import type {
  Candidate,
  LedgerEntry,
  ReconConfig,
  Transaction,
  VendorPattern,
} from "./types";

export type RuleName =
  | "amount_tolerance"
  | "date_window"
  | "running_balance"
  | "recurring_vendor";

export interface RuleEvaluation {
  resolved: boolean;
  /** Winning ledger entry, or the set of entries for a split/batched payment. */
  ledgerEntryIds: string[];
  confidence: number;
  appliedRules: RuleName[];
  rationale: string;
}

export interface RuleContext {
  transaction: Transaction;
  candidates: Candidate[];
  config: ReconConfig;
  /** Open ledger entries for the org, used for split/batch reconstruction. */
  openLedgerEntries: LedgerEntry[];
  vendorPattern: VendorPattern | null;
}

/**
 * Deterministic fallback, evaluated only for transactions whose best embedding
 * score landed in the ambiguous band. Rules are pure functions of the context —
 * no I/O — so they can be unit-tested and audited in isolation.
 */
export function evaluateRules(context: RuleContext): RuleEvaluation {
  const { transaction, candidates, config, vendorPattern } = context;

  const recurring = recurringVendorRule(transaction, candidates, vendorPattern, config);
  if (recurring.resolved) return recurring;

  const [best, runnerUp] = candidates;
  const isTie =
    best !== undefined &&
    runnerUp !== undefined &&
    Math.abs(best.score - runnerUp.score) < config.tieEpsilon;

  const disambiguated = disambiguate(context, isTie ? candidates : best ? [best] : []);
  if (disambiguated.resolved) return disambiguated;

  const split = runningBalanceRule(context);
  if (split.resolved) return split;

  return unresolved(
    isTie
      ? "Top candidates are within the tie epsilon and no deterministic rule separated them"
      : "No deterministic rule confirmed the ambiguous candidate"
  );
}

/**
 * Amount tolerance + date window applied to the tied (or single) candidates.
 * A candidate must pass both to win, and exactly one candidate may pass —
 * two passing candidates stay ambiguous rather than being guessed at.
 */
function disambiguate(context: RuleContext, candidates: Candidate[]): RuleEvaluation {
  const { transaction, config } = context;
  const passing = candidates.filter(
    (candidate) =>
      withinAmountTolerance(transaction.amount, candidate.ledgerEntry.amount, config) &&
      withinDateWindow(transaction.txnDate, candidate.ledgerEntry.entryDate, config)
  );

  if (passing.length !== 1) return unresolved("");

  const winner = passing[0];
  return {
    resolved: true,
    ledgerEntryIds: [winner.ledgerEntry.id],
    confidence: Math.max(config.ruleMatchConfidence, winner.score),
    appliedRules: ["amount_tolerance", "date_window"],
    rationale: `Amount within tolerance (${formatDelta(
      transaction.amount,
      winner.ledgerEntry.amount
    )}) and date within ${config.dateWindowDays} days`,
  };
}

/**
 * Split and batched payments: one bank transaction settling several ledger
 * entries (or several transactions settling one invoice) never matches 1:1 on
 * similarity. Reconstruct the subset of open entries whose total equals the
 * transaction amount within tolerance.
 */
function runningBalanceRule(context: RuleContext): RuleEvaluation {
  const { transaction, config, openLedgerEntries } = context;
  const pool = openLedgerEntries
    .filter(
      (entry) =>
        entry.currency === transaction.currency &&
        withinDateWindow(transaction.txnDate, entry.entryDate, config) &&
        sameVendor(transaction, entry)
    )
    .slice(0, 12); // bounded search: subset enumeration is exponential

  const subset = findSubsetSummingTo(pool, transaction.amount, (a, b) =>
    withinAmountTolerance(a, b, config)
  );
  if (!subset || subset.length < 2) return unresolved("");

  return {
    resolved: true,
    ledgerEntryIds: subset.map((entry) => entry.id),
    confidence: config.ruleMatchConfidence,
    appliedRules: ["running_balance", "amount_tolerance", "date_window"],
    rationale: `Running balance: ${subset.length} ledger entries sum to ${transaction.amount.toFixed(
      2
    )} within tolerance`,
  };
}

/**
 * Per-vendor adaptation: for a vendor with an established baseline, an amount
 * inside its historical spread is trustworthy at a lower similarity score than
 * the global auto-match threshold would allow.
 */
function recurringVendorRule(
  transaction: Transaction,
  candidates: Candidate[],
  pattern: VendorPattern | null,
  config: ReconConfig
): RuleEvaluation {
  if (!pattern || pattern.sampleSize < 3) return unresolved("");
  const best = candidates[0];
  if (!best) return unresolved("");
  if (!sameVendor(transaction, best.ledgerEntry)) return unresolved("");
  if (!withinDateWindow(transaction.txnDate, best.ledgerEntry.entryDate, config)) {
    return unresolved("");
  }

  const spread = Math.max(pattern.amountStddev, config.amountToleranceFlat);
  if (Math.abs(transaction.amount - pattern.avgAmount) > spread) return unresolved("");

  return {
    resolved: true,
    ledgerEntryIds: [best.ledgerEntry.id],
    confidence: Math.min(0.99, Math.max(config.ruleMatchConfidence, best.score) + 0.05),
    appliedRules: ["recurring_vendor", "date_window"],
    rationale: `Recurring vendor "${pattern.vendorName}": amount within historical spread (avg ${pattern.avgAmount.toFixed(
      2
    )} ± ${spread.toFixed(2)}) — confidence boosted`,
  };
}

export function withinAmountTolerance(
  a: number,
  b: number,
  config: Pick<ReconConfig, "amountTolerancePct" | "amountToleranceFlat">
): boolean {
  const tolerance = Math.max(
    Math.abs(a) * config.amountTolerancePct,
    config.amountToleranceFlat
  );
  return Math.abs(Math.abs(a) - Math.abs(b)) <= tolerance;
}

export function withinDateWindow(
  a: string,
  b: string,
  config: Pick<ReconConfig, "dateWindowDays">
): boolean {
  return daysBetween(a, b) <= config.dateWindowDays;
}

export function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000;
  return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / msPerDay;
}

export function sameVendor(transaction: Transaction, entry: LedgerEntry): boolean {
  const txnParty = normalizeParty(transaction.payeeRaw);
  const entryParty = normalizeParty(entry.vendorName);
  if (!txnParty || !entryParty) return false;
  return (
    txnParty === entryParty ||
    txnParty.includes(entryParty) ||
    entryParty.includes(txnParty)
  );
}

/** Exhaustive subset search over a bounded pool; returns the smallest match. */
function findSubsetSummingTo(
  entries: LedgerEntry[],
  target: number,
  matches: (a: number, b: number) => boolean
): LedgerEntry[] | null {
  let best: LedgerEntry[] | null = null;
  const total = entries.length;
  for (let mask = 1; mask < 1 << total; mask++) {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < total; i++) {
      if (mask & (1 << i)) {
        sum += entries[i].amount;
        count++;
      }
    }
    if (count < 2) continue;
    if (!matches(target, sum)) continue;
    if (best === null || count < best.length) {
      best = entries.filter((_, i) => Boolean(mask & (1 << i)));
    }
  }
  return best;
}

function formatDelta(a: number, b: number): string {
  return `${(Math.abs(a) - Math.abs(b)).toFixed(2)}`;
}

function unresolved(rationale: string): RuleEvaluation {
  return {
    resolved: false,
    ledgerEntryIds: [],
    confidence: 0,
    appliedRules: [],
    rationale,
  };
}
