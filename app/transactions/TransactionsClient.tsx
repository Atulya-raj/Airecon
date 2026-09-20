"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../components/AppShell";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge, StatusBadge } from "../components/ui/Badge";
import { Input, Select } from "../components/ui/Input";
import { ExportButton } from "../components/ExportButton";
import { ImportWizard } from "../components/ImportWizard";
import { ManualEntryForm } from "../components/ManualEntryForm";
import { runReconciliationAction } from "../actions";
import type { LedgerEntry, Match, Transaction } from "@/lib/recon/types";

interface TransactionsClientProps {
  transactions: Transaction[];
  matches: Match[];
  openEntries: LedgerEntry[];
  anomalousCount: number;
  orgId: string;
}

const currencySymbols: Record<string, string> = {
  USD: "$",
  INR: "₹",
  EUR: "€",
  GBP: "£",
};

export function TransactionsClient({
  transactions,
  matches,
  openEntries,
  anomalousCount,
  orgId,
}: TransactionsClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"transactions" | "ledger">("transactions");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isRunningRecon, setIsRunningRecon] = useState(false);

  const latestMatch = new Map<string, Match>();
  for (const match of matches) {
    if (!latestMatch.has(match.transactionId)) {
      latestMatch.set(match.transactionId, match);
    }
  }

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      searchQuery === "" ||
      (t.payeeRaw?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (t.memo?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      t.txnDate.includes(searchQuery);
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRefresh = () => {
    router.refresh();
  };

  const handleRunReconciliation = async () => {
    setIsRunningRecon(true);
    try {
      await runReconciliationAction();
      router.refresh();
    } finally {
      setIsRunningRecon(false);
    }
  };

  return (
    <AppShell orgName={orgId} anomalousCount={anomalousCount}>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              Transactions & Ledger
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Manage bank statements, accounting records, CSV imports, and reconciliations.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
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

            <ExportButton
              transactions={filteredTransactions}
              matches={matches}
              ledgerEntries={openEntries}
              orgId={orgId}
            />

            <Button
              variant="primary"
              size="sm"
              loading={isRunningRecon}
              onClick={handleRunReconciliation}
              icon={
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m13 2-2 10h5L11 22l2-10H8l5-10Z" />
                </svg>
              }
            >
              Run Reconciliation
            </Button>
          </div>
        </div>

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


        {/* Tab toggle */}
        <div className="flex gap-1 p-1 rounded-xl bg-[var(--surface-secondary)] w-fit">
          <button
            onClick={() => setActiveTab("transactions")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "transactions"
                ? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Bank Transactions ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "ledger"
                ? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Open Ledger ({openEntries.length})
          </button>
        </div>

        {/* Transactions Tab */}
        {activeTab === "transactions" && (
          <Card padding="none">
            <div className="border-b border-[var(--border-subtle)] px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Input
                  placeholder="Search payee or memo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="sm:max-w-xs"
                  icon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" />
                    </svg>
                  }
                />
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: "all", label: "All Statuses" },
                    { value: "auto_matched", label: "Auto-Matched" },
                    { value: "reviewed", label: "Reviewed" },
                    { value: "anomalous", label: "Needs Review" },
                    { value: "unmatched", label: "Unmatched" },
                  ]}
                  className="sm:max-w-[180px]"
                />
                <span className="text-sm text-[var(--text-tertiary)] ml-auto">
                  {filteredTransactions.length} results
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-[var(--border-default)] bg-[var(--surface-secondary)]/50">
                  <tr>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Date</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Payee</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] text-right">Amount</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Status</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {filteredTransactions.map((transaction) => {
                    const match = latestMatch.get(transaction.id);
                    return (
                      <tr key={transaction.id} className="hover:bg-[var(--surface-secondary)]/40 transition-colors">
                        <td className="px-6 py-3.5 font-mono text-sm text-[var(--text-secondary)] whitespace-nowrap">
                          {transaction.txnDate}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="font-semibold text-sm text-[var(--text-primary)] block">
                            {transaction.payeeRaw ?? "Unnamed"}
                          </span>
                          {transaction.memo && (
                            <span className="text-xs text-[var(--text-tertiary)] font-mono block mt-0.5 truncate max-w-[250px]">
                              {transaction.memo}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono font-bold text-sm text-[var(--text-primary)]">
                          {currencySymbols[transaction.currency] ?? "$"}{transaction.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-3.5">
                          <StatusBadge status={transaction.status} />
                        </td>
                        <td className="px-6 py-3.5 text-sm text-[var(--text-secondary)]">
                          {match ? (
                            <div>
                              <span className="font-semibold capitalize">{match.matchMethod}</span>
                              {match.confidenceScore !== null && (
                                <span className="font-mono text-xs text-[var(--text-tertiary)] ml-1">
                                  ({(match.confidenceScore * 100).toFixed(1)}%)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[var(--text-tertiary)]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Ledger Tab */}
        {activeTab === "ledger" && (
          <Card padding="none">
            <div className="border-b border-[var(--border-subtle)] px-6 py-4">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Open Ledger Entries
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                Accounting entries waiting to be matched against bank transactions.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-[var(--border-default)] bg-[var(--surface-secondary)]/50">
                  <tr>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Date</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Type</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Vendor</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] text-right">Amount</th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Memo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {openEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-[var(--surface-secondary)]/40 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-sm text-[var(--text-secondary)] whitespace-nowrap">
                        {entry.entryDate}
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge variant="muted" size="sm">{entry.entryType}</Badge>
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-sm text-[var(--text-primary)]">
                        {entry.vendorName ?? "—"}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold text-sm text-[var(--text-primary)]">
                        {currencySymbols[entry.currency] ?? "$"}{entry.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-[var(--text-tertiary)] font-mono">
                        {entry.memo ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
