"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "../components/AppShell";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { HealthGauge } from "../components/ui/HealthGauge";
import { InsightCards } from "../components/InsightCards";
import { ActivityTimeline } from "../components/ActivityTimeline";
import { ImportWizard } from "../components/ImportWizard";
import { ManualEntryForm } from "../components/ManualEntryForm";
import {
  seedDemoDataAction,
  runReconciliationAction,
  resetDemoDataAction,
} from "../actions";
import type { ForecastResult } from "@/lib/recon/types";
import type { Insight } from "@/lib/recon/insights";
import type { Notification } from "@/lib/recon/store/types";

interface DashboardClientProps {
  orgId: string;
  counts: {
    total: number;
    autoMatched: number;
    reviewed: number;
    anomalous: number;
    unmatched: number;
  };
  totalVolume: number;
  reconRate: number;
  forecast: ForecastResult;
  insights: Insight[];
  anomalousCount: number;
  recentNotifications: Notification[];
}

export function DashboardClient({
  orgId,
  counts,
  totalVolume,
  reconRate,
  forecast,
  insights,
  anomalousCount,
  recentNotifications,
}: DashboardClientProps) {
  const router = useRouter();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <AppShell orgName={orgId} anomalousCount={anomalousCount}>
      <div className="space-y-8 animate-fade-in">
        {/* Modals */}
        <ImportWizard
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          onSuccess={handleRefresh}
          orgId={orgId}
        />

        <ManualEntryForm
          isOpen={isManualOpen}
          onClose={() => setIsManualOpen(false)}
          onSuccess={handleRefresh}
        />

        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              Reconciliation Center
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Real-time financial visibility, AI discrepancy detection, and automated book matching.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsManualOpen(true)}
              icon={
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              }
            >
              Add Record
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsImportOpen(true)}
              icon={
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
              }
            >
              Import CSV
            </Button>
            <form action={seedDemoDataAction}>
              <Button
                variant="secondary"
                size="sm"
                type="submit"
                icon={
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                    <path d="M6 6h10M6 10h10M6 14h6" />
                  </svg>
                }
              >
                Load Demo
              </Button>
            </form>
            <form action={runReconciliationAction}>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                icon={
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="m13 2-2 10h5L11 22l2-10H8l5-10Z" />
                  </svg>
                }
              >
                Run AI Reconciliation
              </Button>
            </form>
            <form action={resetDemoDataAction}>
              <Button variant="ghost" size="sm" type="submit" title="Reset all data to empty state">
                Reset
              </Button>
            </form>
          </div>
        </div>

        {/* Clean Slate Onboarding Card for New/Empty Users */}
        {counts.total === 0 && (
          <div className="p-6 rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-default)] shadow-xs space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-primary-50)] text-[var(--color-primary-600)] flex items-center justify-center text-xl flex-shrink-0">
                🚀
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Clean Slate Workspace Ready
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  You are logged into a dynamic, isolated workspace with zero pre-loaded transactions. Build your verified financial ledger using any of the methods below:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsImportOpen(true)}
                className="p-4 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--color-primary-500)] bg-[var(--surface-secondary)]/50 text-left transition-all cursor-pointer group"
              >
                <div className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--color-primary-600)] flex items-center gap-1.5">
                  📁 Import CSV File
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                  Upload bank statement (HDFC, SBI, Chase) or ERP ledger CSV.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setIsManualOpen(true)}
                className="p-4 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--color-primary-500)] bg-[var(--surface-secondary)]/50 text-left transition-all cursor-pointer group"
              >
                <div className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--color-primary-600)] flex items-center gap-1.5">
                  ✍️ Add Record Manually
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                  Enter bank transactions with UPI, GSTIN, or open invoices.
                </p>
              </button>

              <Link
                href="/bank-feeds"
                className="p-4 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--color-primary-500)] bg-[var(--surface-secondary)]/50 text-left transition-all group block"
              >
                <div className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--color-primary-600)] flex items-center gap-1.5">
                  ⚡ Connect Bank Feeds
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                  Sync live transactions via RBI Account Aggregator or Plaid.
                </p>
              </Link>
            </div>
          </div>
        )}

        {/* Top Row: Health Gauge + Metric Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Health Score */}
          <Card className="lg:col-span-4 flex flex-col items-center justify-center py-8 animate-fade-in-up">
            <HealthGauge
              value={reconRate}
              size={180}
              label="Reconciliation Health"
              sublabel={`${counts.autoMatched + counts.reviewed} of ${counts.total} matched`}
            />
            <div className="mt-6 w-full px-4">
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-secondary)]">
                <div
                  className="bg-[var(--color-success-500)] transition-all duration-700"
                  style={{ width: `${counts.total > 0 ? (counts.autoMatched / counts.total) * 100 : 0}%` }}
                />
                <div
                  className="bg-[var(--color-info-500)] transition-all duration-700"
                  style={{ width: `${counts.total > 0 ? (counts.reviewed / counts.total) * 100 : 0}%` }}
                />
                <div
                  className="bg-[var(--color-warning-500)] transition-all duration-700"
                  style={{ width: `${counts.total > 0 ? (counts.anomalous / counts.total) * 100 : 0}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="status-dot bg-[var(--color-success-500)]" />
                  <span className="text-[var(--text-secondary)]">Auto ({counts.autoMatched})</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="status-dot bg-[var(--color-info-500)]" />
                  <span className="text-[var(--text-secondary)]">Reviewed ({counts.reviewed})</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="status-dot bg-[var(--color-warning-500)]" />
                  <span className="text-[var(--text-secondary)]">Pending ({counts.anomalous})</span>
                </span>
              </div>
            </div>
          </Card>

          {/* Metric Cards Grid */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-children">
            {/* Total Volume */}
            <Card className="animate-fade-in-up">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Book Volume
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                  <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="20" height="14" x="2" y="5" rx="2" />
                    <line x1="2" x2="22" y1="10" y2="10" />
                  </svg>
                </span>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">{counts.total}</span>
                <span className="ml-2 text-sm text-[var(--text-secondary)]">transactions</span>
              </div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                ${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })} total
              </p>
            </Card>

            {/* Auto-Matched */}
            <Card className="animate-fade-in-up">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-success-text)]">
                  Auto-Reconciled
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-success-50)] text-[var(--color-success-500)]">
                  <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </span>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold tracking-tight text-[var(--color-success-text)]">{counts.autoMatched}</span>
                <span className="ml-2 text-sm text-[var(--text-secondary)]">
                  ({counts.total > 0 ? ((counts.autoMatched / counts.total) * 100).toFixed(0) : 0}% automated)
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                No human touches needed
              </p>
            </Card>

            {/* Cash Position */}
            <Card className="animate-fade-in-up">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Daily Trajectory
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                  <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
                  </svg>
                </span>
              </div>
              <div className="mt-3">
                <span
                  className={`text-3xl font-bold tracking-tight font-mono ${
                    forecast.summary.netDailyBurnOrGrowth >= 0
                      ? "text-[var(--color-success-text)]"
                      : "text-[var(--color-danger-text)]"
                  }`}
                >
                  {forecast.summary.netDailyBurnOrGrowth >= 0 ? "+" : ""}$
                  {forecast.summary.netDailyBurnOrGrowth.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
                <span className="ml-2 text-sm text-[var(--text-secondary)]">/day</span>
              </div>
              <Link href="/forecast" className="mt-2 text-sm text-[var(--color-primary-600)] hover:underline font-medium">
                View forecast →
              </Link>
            </Card>

            {/* Needs Review */}
            <Card className="animate-fade-in-up">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-warning-text)]">
                  Needs Review
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-warning-50)] text-[var(--color-warning-500)]">
                  <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </span>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold tracking-tight text-[var(--color-warning-text)]">{counts.anomalous}</span>
                <span className="ml-2 text-sm text-[var(--text-secondary)]">flagged</span>
              </div>
              {counts.anomalous > 0 ? (
                <Link href="/reconcile" className="mt-2 text-sm text-[var(--color-primary-600)] hover:underline font-medium">
                  Review now →
                </Link>
              ) : (
                <p className="mt-2 text-sm text-[var(--text-secondary)]">All clear!</p>
              )}
            </Card>
          </div>
        </div>

        {/* Insights Section */}
        {insights.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Actionable Insights & Directives
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Autonomous recommendations derived from discrepancies, runway burn, and pattern baselines.
                </p>
              </div>
            </div>
            <InsightCards insights={insights.slice(0, 6)} />
          </section>
        )}

        {/* Audit Trail & Activity Timeline */}
        <section>
          <ActivityTimeline notifications={recentNotifications} />
        </section>
      </div>
    </AppShell>
  );
}
