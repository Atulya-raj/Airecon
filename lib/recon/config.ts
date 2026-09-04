import type { ReconConfig } from "./types";

/**
 * Baseline thresholds. Per-org overrides are persisted in recon_org_config
 * and merged over these defaults.
 */
export const DEFAULT_RECON_CONFIG: Omit<ReconConfig, "orgId"> = {
  autoMatchThreshold: 0.92,
  ambiguousBandFloor: 0.75,
  topK: 5,
  tieEpsilon: 0.03,
  amountTolerancePct: 0.02,
  amountToleranceFlat: 1.5,
  dateWindowDays: 5,
  anomalyZScoreThreshold: 2.5,
  anomalyIntervalFactor: 2,
  ruleMatchConfidence: 0.85,
};

export function resolveConfig(
  orgId: string,
  overrides: Partial<ReconConfig> = {}
): ReconConfig {
  const merged: ReconConfig = {
    ...DEFAULT_RECON_CONFIG,
    ...stripUndefined(overrides),
    orgId,
  };

  if (merged.ambiguousBandFloor >= merged.autoMatchThreshold) {
    throw new Error(
      "Invalid recon config: ambiguousBandFloor must be below autoMatchThreshold"
    );
  }
  if (merged.topK < 1) {
    throw new Error("Invalid recon config: topK must be at least 1");
  }
  return merged;
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}
