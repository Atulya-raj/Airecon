"use client";

import React, { useState } from "react";
import { AppShell } from "../components/AppShell";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { EmptyState } from "../components/ui/EmptyState";
import type { VendorPattern } from "@/lib/recon/types";

interface VendorsClientProps {
  vendorPatterns: VendorPattern[];
  anomalousCount: number;
  orgId: string;
}

export function VendorsClient({
  vendorPatterns,
  anomalousCount,
  orgId,
}: VendorsClientProps) {
  const [search, setSearch] = useState("");

  const filtered = vendorPatterns.filter((p) =>
    p.vendorName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell orgName={orgId} anomalousCount={anomalousCount}>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            Vendor Baselines
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            ReconAI learns from your confirmed transactions to build statistical baselines for each vendor.
          </p>
        </div>

        {/* How it works card */}
        <Card variant="glass" className="border-[var(--color-primary-500)]/20">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-600)] text-white shadow-sm">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                How Vendor Baselines Work
              </h4>
              <p className="mt-1 text-sm text-[var(--text-secondary)] leading-relaxed">
                When a recurring vendor (e.g., AWS, Cloudspend) charges within its typical range 
                (Average ± Variance), match confidence is boosted automatically. If a charge 
                diverges significantly, it&apos;s flagged for your review.
              </p>
            </div>
          </div>
        </Card>

        {/* Search & Table */}
        <Card padding="none">
          <div className="border-b border-[var(--border-subtle)] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Learned Baselines
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                {vendorPatterns.length} vendor{vendorPatterns.length !== 1 ? "s" : ""} tracked
              </p>
            </div>
            <Input
              placeholder="Search vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
              icon={
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" />
                </svg>
              }
            />
          </div>

          {filtered.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title={vendorPatterns.length === 0 ? "No Baselines Yet" : "No Results"}
                description={
                  vendorPatterns.length === 0
                    ? "Vendor baselines are created automatically as you confirm reconciliation matches. Load the demo data and run reconciliation to see this in action."
                    : "No vendors match your search query."
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-[var(--border-default)] bg-[var(--surface-secondary)]/50">
                  <tr>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Vendor</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Status</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] text-right">Avg Charge (μ)</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] text-right">Spread (σ)</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] text-right">Cadence</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] text-center">Samples</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {filtered.map((p) => {
                    const isEstablished = p.sampleSize >= 3;
                    return (
                      <tr key={p.id} className="hover:bg-[var(--surface-secondary)]/40 transition-colors">
                        <td className="px-6 py-3.5 font-semibold text-sm text-[var(--text-primary)] capitalize">
                          {p.vendorName}
                        </td>
                        <td className="px-6 py-3.5">
                          <Badge
                            variant={isEstablished ? "success" : "default"}
                            dot
                          >
                            {isEstablished ? "Active" : "Learning"}
                          </Badge>
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono font-bold text-sm text-[var(--text-primary)]">
                          ${p.avgAmount.toFixed(2)}
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono text-sm text-[var(--text-secondary)]">
                          ±${p.amountStddev.toFixed(2)}
                        </td>
                        <td className="px-6 py-3.5 text-right text-sm text-[var(--text-secondary)]">
                          {p.typicalIntervalDays > 0 ? `~${p.typicalIntervalDays.toFixed(0)} days` : "Irregular"}
                        </td>
                        <td className="px-6 py-3.5 text-center font-mono font-semibold text-sm text-[var(--text-primary)]">
                          {p.sampleSize}
                        </td>
                        <td className="px-6 py-3.5 text-sm text-[var(--text-tertiary)]">
                          {new Date(p.lastUpdated).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
