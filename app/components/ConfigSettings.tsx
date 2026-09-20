"use client";

import React from "react";
import { saveConfigAction } from "../actions";
import { Button } from "./ui/Button";
import type { ReconConfig } from "@/lib/recon/types";

interface ConfigSettingsProps {
  config: ReconConfig;
}

export function ConfigSettings({ config }: ConfigSettingsProps) {
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="border-b border-[var(--border-subtle)] pb-5">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Matching Engine Parameters &amp; Tolerances
            </h3>
            <span className="rounded-md bg-[var(--surface-secondary)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">
              Per-Tenant Config
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Adjust confidence cutoffs, arithmetic fee tolerances, and anomaly sensitivity for organization <strong className="text-[var(--text-primary)] font-mono">{config.orgId}</strong>.
          </p>
        </div>

        <form action={saveConfigAction} className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Auto Match Threshold */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/40 p-4 transition-all hover:border-[var(--border-default)]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  Auto-Match Similarity Threshold
                </label>
                <span className="font-mono text-[11px] text-[var(--text-tertiary)] font-semibold">
                  Default: 0.92
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                Vector cosine similarity at or above which a bank transaction immediately reconciles without manual operator approval.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="number"
                  step="0.01"
                  min="0.5"
                  max="1.0"
                  name="autoMatchThreshold"
                  defaultValue={config.autoMatchThreshold}
                  className="w-28 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-xs font-mono font-bold text-[var(--text-primary)] shadow-sm focus:border-[var(--color-primary-600)] focus:outline-none"
                />
                <span className="text-xs text-[var(--text-tertiary)]">Value (0.50 &ndash; 1.00)</span>
              </div>
            </div>

            {/* Ambiguous Band Floor */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/40 p-4 transition-all hover:border-[var(--border-default)]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  Ambiguous Band Floor
                </label>
                <span className="font-mono text-[11px] text-[var(--text-tertiary)] font-semibold">
                  Default: 0.75
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                Candidates scoring between this floor and the auto-match threshold are evaluated by the deterministic rule engine.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="0.99"
                  name="ambiguousBandFloor"
                  defaultValue={config.ambiguousBandFloor}
                  className="w-28 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-xs font-mono font-bold text-[var(--text-primary)] shadow-sm focus:border-[var(--color-primary-600)] focus:outline-none"
                />
                <span className="text-xs text-[var(--text-tertiary)]">Value (0.10 &ndash; 0.99)</span>
              </div>
            </div>

            {/* Fee Tolerance Percentage */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/40 p-4 transition-all hover:border-[var(--border-default)]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  Fee Variance Tolerance (%)
                </label>
                <span className="font-mono text-[11px] text-[var(--text-tertiary)] font-semibold">
                  Default: 2.0%
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                Allowable percentage discrepancy between bank debit/deposit and invoice amount (e.g. credit card processor fees, FX spreads).
              </p>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="20"
                  name="amountTolerancePct"
                  defaultValue={Math.round(config.amountTolerancePct * 1000) / 10}
                  className="w-28 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-xs font-mono font-bold text-[var(--text-primary)] shadow-sm focus:border-[var(--color-primary-600)] focus:outline-none"
                />
                <span className="text-xs text-[var(--text-tertiary)]">% of transaction amount</span>
              </div>
            </div>

            {/* Flat Amount Tolerance */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/40 p-4 transition-all hover:border-[var(--border-default)]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  Flat Amount Tolerance ($)
                </label>
                <span className="font-mono text-[11px] text-[var(--text-tertiary)] font-semibold">
                  Default: $15.00
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                Maximum fixed dollar fee variance allowed regardless of percentage (e.g. fixed wire fee deduction of $12–$15).
              </p>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="500"
                  name="amountToleranceFlat"
                  defaultValue={config.amountToleranceFlat}
                  className="w-28 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-xs font-mono font-bold text-[var(--text-primary)] shadow-sm focus:border-[var(--color-primary-600)] focus:outline-none"
                />
                <span className="text-xs text-[var(--text-tertiary)]">Fixed USD amount</span>
              </div>
            </div>

            {/* Date Window Days */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/40 p-4 transition-all hover:border-[var(--border-default)]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  Settlement Window (Calendar Days)
                </label>
                <span className="font-mono text-[11px] text-[var(--text-tertiary)] font-semibold">
                  Default: 7 days
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                Maximum calendar days allowable between the invoice entry date and the bank settlement timestamp.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="60"
                  name="dateWindowDays"
                  defaultValue={config.dateWindowDays}
                  className="w-28 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-xs font-mono font-bold text-[var(--text-primary)] shadow-sm focus:border-[var(--color-primary-600)] focus:outline-none"
                />
                <span className="text-xs text-[var(--text-tertiary)]">Days allowed</span>
              </div>
            </div>

            {/* Anomaly Z-Score */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/40 p-4 transition-all hover:border-[var(--border-default)]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  Anomaly Sensitivity (&sigma; Z-Score)
                </label>
                <span className="font-mono text-[11px] text-[var(--text-tertiary)] font-semibold">
                  Default: 2.5&sigma;
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                Standard deviations away from a recurring vendor&apos;s historical average before an anomaly flag is raised.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="6.0"
                  name="anomalyZScoreThreshold"
                  defaultValue={config.anomalyZScoreThreshold}
                  className="w-28 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-xs font-mono font-bold text-[var(--text-primary)] shadow-sm focus:border-[var(--color-primary-600)] focus:outline-none"
                />
                <span className="text-xs text-[var(--text-tertiary)]">&sigma; deviation cutoff</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-[var(--border-subtle)] pt-5">
            <Button
              type="submit"
              variant="primary"
              size="md"
              icon={
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
              }
            >
              Save Engine Parameters
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
