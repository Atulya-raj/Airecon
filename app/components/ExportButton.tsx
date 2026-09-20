"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "./ui/Button";
import {
  exportTransactionsCSV,
  exportLedgerCSV,
  exportAuditReportCSV,
  downloadCSV,
} from "@/lib/recon/export";
import type { LedgerEntry, Match, Transaction } from "@/lib/recon/types";

interface ExportButtonProps {
  transactions: Transaction[];
  matches: Match[];
  ledgerEntries?: LedgerEntry[];
  orgId: string;
}

export function ExportButton({
  transactions,
  matches,
  ledgerEntries = [],
  orgId,
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExportTransactions = () => {
    const csv = exportTransactionsCSV(transactions, matches);
    downloadCSV(csv, `reconai-transactions-${orgId}-${new Date().toISOString().slice(0, 10)}.csv`);
    setIsOpen(false);
  };

  const handleExportLedger = () => {
    const csv = exportLedgerCSV(ledgerEntries);
    downloadCSV(csv, `reconai-ledger-${orgId}-${new Date().toISOString().slice(0, 10)}.csv`);
    setIsOpen(false);
  };

  const handleExportAudit = () => {
    const csv = exportAuditReportCSV(transactions, matches, ledgerEntries);
    downloadCSV(csv, `reconai-audit-report-${orgId}-${new Date().toISOString().slice(0, 10)}.csv`);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        icon={
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
        }
      >
        Export Reports
        <svg className="ml-1.5 h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl bg-[var(--surface-primary)] p-1.5 shadow-xl ring-1 ring-black/10 border border-[var(--border-default)] z-50 animate-fade-in-up">
          <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
            <p className="text-xs font-bold text-[var(--text-primary)]">Download Reports</p>
            <p className="text-[11px] text-[var(--text-tertiary)]">CSV format ready for Excel & Sheets</p>
          </div>

          <div className="py-1">
            <button
              onClick={handleExportTransactions}
              className="w-full flex items-start gap-2.5 px-3 py-2 text-left rounded-xl text-xs hover:bg-[var(--surface-secondary)] text-[var(--text-primary)] transition-colors"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] mt-0.5">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <line x1="2" x2="22" y1="10" y2="10" />
                </svg>
              </span>
              <div>
                <span className="font-bold block">Bank Transactions CSV</span>
                <span className="text-[11px] text-[var(--text-secondary)]">All bank records & status</span>
              </div>
            </button>

            {ledgerEntries.length > 0 && (
              <button
                onClick={handleExportLedger}
                className="w-full flex items-start gap-2.5 px-3 py-2 text-left rounded-xl text-xs hover:bg-[var(--surface-secondary)] text-[var(--text-primary)] transition-colors"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--surface-secondary)] text-[var(--text-secondary)] mt-0.5">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  </svg>
                </span>
                <div>
                  <span className="font-bold block">Open Ledger CSV</span>
                  <span className="text-[11px] text-[var(--text-secondary)]">Unmatched invoices & expenses</span>
                </div>
              </button>
            )}

            <button
              onClick={handleExportAudit}
              className="w-full flex items-start gap-2.5 px-3 py-2 text-left rounded-xl text-xs hover:bg-[var(--surface-secondary)] text-[var(--text-primary)] transition-colors border-t border-[var(--border-subtle)] mt-1 pt-2"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--color-primary-500)]/10 text-[var(--color-primary-600)] mt-0.5">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </span>
              <div>
                <span className="font-bold text-[var(--color-primary-600)] block">Reconciliation Audit Trail</span>
                <span className="text-[11px] text-[var(--text-secondary)]">Cross-referenced with AI rationale</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
