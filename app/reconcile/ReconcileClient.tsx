"use client";

import React from "react";
import { AppShell } from "../components/AppShell";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { confirmMatchAction } from "../actions";
import type { Candidate, ReconConfig, Transaction } from "@/lib/recon/types";
import type { Notification } from "@/lib/recon/store/types";

interface ReconcileClientProps {
  reviewCandidates: { transaction: Transaction; candidates: Candidate[] }[];
  notificationMap: Record<string, Notification>;
  config: ReconConfig;
  anomalousCount: number;
}

export function ReconcileClient({
  reviewCandidates,
  notificationMap,
  config,
  anomalousCount,
}: ReconcileClientProps) {
  return (
    <AppShell orgName={config.orgId} anomalousCount={anomalousCount}>
      <div className="space-y-8 animate-fade-in">
        {/* Page Header */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                Reconciliation Queue
              </h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Transactions that need your review before they can be committed to the ledger.
              </p>
            </div>
            {anomalousCount > 0 && (
              <Badge variant="warning" dot dotPulse size="md">
                {anomalousCount} item{anomalousCount > 1 ? "s" : ""} pending
              </Badge>
            )}
          </div>
        </div>

        {/* Review Cards */}
        {reviewCandidates.length === 0 ? (
          <EmptyState
            icon={
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            }
            title="All Caught Up!"
            description="There are no transactions waiting for review. New items will appear here automatically when the reconciliation engine flags something it can't resolve on its own."
          />
        ) : (
          <div className="space-y-6 stagger-children">
            {reviewCandidates.map(({ transaction, candidates }) => (
              <ReviewCard
                key={transaction.id}
                transaction={transaction}
                candidates={candidates}
                reason={notificationMap[transaction.id]?.message ?? null}
                config={config}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ReviewCard({
  transaction,
  candidates,
  reason,
  config,
}: {
  transaction: Transaction;
  candidates: Candidate[];
  reason: string | null;
  config: ReconConfig;
}) {
  return (
    <Card className="animate-fade-in-up" padding="none">
      {/* Transaction header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-6 border-b border-[var(--border-subtle)]">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Badge variant="warning" dot>Manual Review Required</Badge>
            <span className="text-xs text-[var(--text-tertiary)] font-mono">
              {transaction.txnDate}
            </span>
          </div>
          <h3 className="text-xl font-bold text-[var(--text-primary)]">
            {transaction.payeeRaw ?? "Unnamed Payee"}
          </h3>
          {transaction.memo && (
            <p className="text-sm text-[var(--text-secondary)] bg-[var(--surface-secondary)] px-3 py-1.5 rounded-lg inline-block font-mono text-xs">
              {transaction.memo}
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-2xl font-bold font-mono text-[var(--text-primary)]">
            ${transaction.amount.toFixed(2)}
          </span>
          <span className="block text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mt-1">
            {transaction.currency}
          </span>
        </div>
      </div>

      {/* Anomaly reason */}
      {reason && (
        <div className="mx-6 mt-4 rounded-xl bg-[var(--color-warning-50)] border border-[var(--color-warning-500)]/20 p-4 flex items-start gap-3">
          <svg className="h-5 w-5 text-[var(--color-warning-500)] flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-[var(--color-warning-text)]">Why this was flagged</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">{reason}</p>
          </div>
        </div>
      )}

      {/* Candidate matches */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-[var(--text-primary)]">
            Possible Matches ({candidates.length})
          </h4>
          <span className="text-xs text-[var(--text-tertiary)]">
            Ranked by AI confidence (Auto-match threshold: {(config.autoMatchThreshold * 100).toFixed(0)}%)
          </span>
        </div>

        {candidates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--surface-secondary)]/30 p-6 text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              No matching ledger entries found for this transaction.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {candidates.map(({ ledgerEntry, score }) => {
              const amountDelta = transaction.amount - ledgerEntry.amount;
              const isExact = Math.abs(amountDelta) < 0.01;

              return (
                <div
                  key={ledgerEntry.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)]/30 p-4 hover:bg-[var(--surface-secondary)] transition-colors"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[var(--text-primary)]">
                        {ledgerEntry.vendorName ?? "Unknown Vendor"}
                      </span>
                      <Badge variant="muted" size="sm">
                        {ledgerEntry.entryType}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
                      <span>{ledgerEntry.entryDate}</span>
                      <span>•</span>
                      <span className="font-mono font-semibold text-[var(--text-primary)]">
                        ${ledgerEntry.amount.toFixed(2)}
                      </span>
                      {!isExact && (
                        <Badge variant="warning" size="sm">
                          Δ ${Math.abs(amountDelta).toFixed(2)}
                        </Badge>
                      )}
                    </div>
                    {/* Confidence bar */}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--surface-secondary)]">
                        <div
                          className="h-full rounded-full bg-[var(--color-primary-500)]"
                          style={{ width: `${Math.max(5, Math.min(100, score * 100))}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-[var(--color-primary-600)] font-mono">
                        {(score * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <form action={confirmMatchAction}>
                    <input type="hidden" name="transactionId" value={transaction.id} />
                    <input type="hidden" name="ledgerEntryId" value={ledgerEntry.id} />
                    <Button variant="primary" size="sm" type="submit">
                      Confirm Match
                    </Button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dismiss action */}
      <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-6 py-4">
        <span className="text-sm text-[var(--text-secondary)]">
          No match for this transaction?
        </span>
        <form action={confirmMatchAction}>
          <input type="hidden" name="transactionId" value={transaction.id} />
          <input type="hidden" name="ledgerEntryId" value="" />
          <Button variant="ghost" size="sm" type="submit">
            Mark as Reviewed →
          </Button>
        </form>
      </div>
    </Card>
  );
}
