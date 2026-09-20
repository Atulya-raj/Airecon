"use client";

import React, { useState } from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { Select } from "./ui/Input";
import {
  parseCSVText,
  detectColumnMapping,
  mapRowsToTransactions,
  mapRowsToLedgerEntries,
  type ColumnMapping,
} from "@/lib/recon/csv-parser";
import type { Currency } from "@/lib/recon/types";

interface ImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orgId: string;
}

export function ImportWizard({ isOpen, onClose, onSuccess, orgId }: ImportWizardProps) {
  const [importType, setImportType] = useState<"bank" | "ledger">("bank");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    dateCol: 0,
    amountCol: 1,
    payeeCol: 2,
  });
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("USD");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [runReconAfter, setRunReconAfter] = useState(true);

  const resetState = () => {
    setStep(1);
    setFileName("");
    setHeaders([]);
    setParsedRows([]);
    setImportStatus(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || "");
      processRawCSV(text);
    };
    reader.readAsText(file);
  };

  const processRawCSV = (text: string) => {
    const rows = parseCSVText(text);
    if (rows.length < 2) {
      alert("CSV must contain at least a header row and one data row.");
      return;
    }

    const headerRow = rows[0];
    const dataRows = rows.slice(1);
    const autoMap = detectColumnMapping(headerRow);

    setHeaders(headerRow);
    setParsedRows(dataRows);
    setMapping(autoMap);
    setStep(2);
  };

  const loadSampleCSV = () => {
    if (importType === "bank") {
      const sample = `Date,Description,Amount,Currency,Memo
2026-09-18,Stripe Payout,12500.00,USD,Weekly merchant disbursement
2026-09-19,Amazon Web Services,1450.80,USD,Cloud compute & storage us-east
2026-09-19,Google Workspace,120.00,USD,Monthly corporate suite 20 seats
2026-09-20,Apex Design Studio,3200.00,USD,UI/UX prototype redesign retainer
2026-09-20,Delta Airlines,580.40,USD,Client pitch flight NYC to SFO`;
      setFileName("sample_bank_statement.csv");
      processRawCSV(sample);
    } else {
      const sample = `Date,Type,Vendor,Amount,Currency,Memo
2026-09-18,invoice,Stripe,12500.00,USD,Batch payout INV-9801
2026-09-19,expense,Amazon Web Services,1450.80,USD,AWS Monthly Cloud Bill
2026-09-19,expense,Google,120.00,USD,GSuite Subscription
2026-09-20,invoice,Apex Design Studio,3200.00,USD,Design Services Milestone 2
2026-09-20,expense,Delta Air Lines,580.40,USD,Q3 Conference Travel`;
      setFileName("sample_accounting_ledger.csv");
      processRawCSV(sample);
    }
  };

  const loadIndianBankSampleCSV = () => {
    const sample = `Date,Narration,Withdrawal,Deposit,Chq/Ref No
2026-09-18,UPI/428192841920/SWIGGY-BANGALORE/swiggy@icici/Food Delivery,1450.00,,UPI-428192841920
2026-09-19,NEFT-N9481928410-INFOSYS TECHNOLOGIES LTD-VENDOR,,125000.00,NEFT-N9481928410
2026-09-19,UPI/428192849911/AMAZON-PAY-SELLER/seller@apl/Office Supplies,8420.00,,UPI-428192849911
2026-09-20,RTGS-HDFC00012-TATA CONSULTANCY SERVICES,,450000.00,RTGS-HDFC00012
2026-09-20,POS 4012XXXXXXXX8912 CHAI POINT BANGALORE,280.00,,POS-8912`;
    setFileName("hdfc_indian_bank_statement.csv");
    setSelectedCurrency("INR");
    setImportType("bank");
    processRawCSV(sample);
  };

  // Preview validation results
  const previewValidation = () => {
    if (importType === "bank") {
      const res = mapRowsToTransactions(parsedRows, mapping, selectedCurrency);
      return { kind: "bank" as const, itemsCount: res.transactions.length, errorsCount: res.errors.length };
    } else {
      const res = mapRowsToLedgerEntries(parsedRows, mapping, selectedCurrency);
      return { kind: "ledger" as const, itemsCount: res.entries.length, errorsCount: res.errors.length };
    }
  };

  const validationResult = step === 3 ? previewValidation() : null;

  const handleImportSubmit = async () => {
    setIsSubmitting(true);
    setImportStatus("Importing records...");

    try {
      if (importType === "bank") {
        const { transactions } = mapRowsToTransactions(parsedRows, mapping, selectedCurrency);
        if (transactions.length === 0) {
          throw new Error("No valid transactions found to import. Check mapping.");
        }

        const res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "bank",
            transactions,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to import transactions");
        }
      } else {
        const { entries } = mapRowsToLedgerEntries(parsedRows, mapping, selectedCurrency);
        if (entries.length === 0) {
          throw new Error("No valid ledger entries found to import. Check mapping.");
        }

        const res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "ledger",
            entries,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to import ledger entries");
        }
      }

      if (runReconAfter) {
        setImportStatus("Running AI reconciliation pipeline...");
        await fetch("/api/reconcile", { method: "POST" });
      }

      setImportStatus("Completed successfully!");
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed";
      alert(msg);
      setIsSubmitting(false);
      setImportStatus(null);
    }
  };

  const columnOptions = [
    { value: "-1", label: "— Do Not Map —" },
    ...headers.map((h, i) => ({ value: String(i), label: `${h} (Col ${i + 1})` })),
  ];

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title="Import Financial Data (CSV)"
      description={`Upload bank statement or accounting ledger CSV for ${orgId} to automatically reconcile records.`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                step === 1
                  ? "bg-[var(--color-primary-600)] text-white"
                  : "bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
              }`}
            >
              1
            </span>
            <span className={`text-sm font-semibold ${step === 1 ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
              Upload CSV
            </span>
          </div>
          <div className="h-0.5 w-8 bg-[var(--border-subtle)]" />
          <div className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                step === 2
                  ? "bg-[var(--color-primary-600)] text-white"
                  : "bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
              }`}
            >
              2
            </span>
            <span className={`text-sm font-semibold ${step === 2 ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
              Map Columns
            </span>
          </div>
          <div className="h-0.5 w-8 bg-[var(--border-subtle)]" />
          <div className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                step === 3
                  ? "bg-[var(--color-primary-600)] text-white"
                  : "bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
              }`}
            >
              3
            </span>
            <span className={`text-sm font-semibold ${step === 3 ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
              Review & Import
            </span>
          </div>
        </div>

        {/* STEP 1: Upload or Paste */}
        {step === 1 && (
          <div className="space-y-5">
            {/* Import Type Selector */}
            <div>
              <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">
                What are you importing?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setImportType("bank")}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    importType === "bank"
                      ? "border-[var(--color-primary-600)] bg-[var(--color-primary-500)]/10 ring-2 ring-[var(--color-primary-500)]/20"
                      : "border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--surface-secondary)]/40"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm text-[var(--text-primary)]">
                    <svg className="h-5 w-5 text-[var(--color-primary-600)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="20" height="14" x="2" y="5" rx="2" />
                      <line x1="2" x2="22" y1="10" y2="10" />
                    </svg>
                    Bank Statement Transactions
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Raw charges and credits downloaded directly from your bank or card account.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setImportType("ledger")}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    importType === "ledger"
                      ? "border-[var(--color-primary-600)] bg-[var(--color-primary-500)]/10 ring-2 ring-[var(--color-primary-500)]/20"
                      : "border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--surface-secondary)]/40"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm text-[var(--text-primary)]">
                    <svg className="h-5 w-5 text-[var(--color-primary-600)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    Accounting Ledger Entries
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Expected invoices, bills, and payment records from QuickBooks, Xero, or ERP.
                  </p>
                </button>
              </div>
            </div>

            {/* Dropzone */}
            <div className="border-2 border-dashed border-[var(--border-default)] hover:border-[var(--color-primary-500)] rounded-2xl p-8 text-center transition-all bg-[var(--surface-secondary)]/30">
              <input
                type="file"
                id="csv-file-input"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="csv-file-input" className="cursor-pointer block">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary-500)]/10 text-[var(--color-primary-600)] mb-3">
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                </div>
                <span className="text-base font-bold text-[var(--text-primary)] block">
                  Click to select a CSV file
                </span>
                <span className="text-xs text-[var(--text-secondary)] mt-1 block">
                  Supports standard CSV exports from Chase, Wells Fargo, BoA, Stripe, QuickBooks & Xero.
                </span>
              </label>
            </div>

            {/* Paste or Try Sample */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <span className="text-xs text-[var(--text-tertiary)]">
                Try realistic sample statement:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadIndianBankSampleCSV}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg text-[var(--color-primary-600)] bg-[var(--surface-secondary)] hover:bg-[var(--color-primary-50)] transition-colors border border-[var(--border-subtle)] cursor-pointer"
                >
                  🇮🇳 Indian Bank (UPI/NEFT)
                </button>
                <button
                  type="button"
                  onClick={loadSampleCSV}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg text-[var(--text-secondary)] bg-[var(--surface-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border-subtle)] cursor-pointer"
                >
                  🌐 Global (USD)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Map Columns */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">
                  Verify Detected Columns
                </h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  Found {parsedRows.length} rows in <span className="font-mono">{fileName || "data.csv"}</span>.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-secondary)]">Default Currency:</span>
                <Select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value as Currency)}
                  options={[
                    { value: "USD", label: "USD ($)" },
                    { value: "INR", label: "INR (₹)" },
                    { value: "EUR", label: "EUR (€)" },
                    { value: "GBP", label: "GBP (£)" },
                  ]}
                  className="w-28 text-xs py-1"
                />
              </div>
            </div>

            {/* Mapping Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[var(--surface-secondary)]/40 p-4 rounded-xl border border-[var(--border-subtle)]">
              <Select
                label="Date Column *"
                value={String(mapping.dateCol)}
                onChange={(e) => setMapping({ ...mapping, dateCol: parseInt(e.target.value, 10) })}
                options={columnOptions.filter((o) => o.value !== "-1")}
                hint="Transaction or invoice date (YYYY-MM-DD, MM/DD/YYYY)"
              />

              <Select
                label={importType === "bank" ? "Payee / Merchant Column *" : "Vendor / Client Column *"}
                value={String(mapping.payeeCol)}
                onChange={(e) => setMapping({ ...mapping, payeeCol: parseInt(e.target.value, 10) })}
                options={columnOptions}
                hint="Name of company or person"
              />

              <Select
                label="Amount Column *"
                value={String(mapping.amountCol)}
                onChange={(e) => setMapping({ ...mapping, amountCol: parseInt(e.target.value, 10) })}
                options={columnOptions}
                hint="Total charge or credit amount"
              />

              <Select
                label="Memo / Reference Column (Optional)"
                value={mapping.memoCol !== undefined ? String(mapping.memoCol) : "-1"}
                onChange={(e) => setMapping({ ...mapping, memoCol: parseInt(e.target.value, 10) })}
                options={columnOptions}
                hint="Notes, invoice ID, or transaction memo"
              />

              {importType === "ledger" && (
                <Select
                  label="Entry Type Column (Optional)"
                  value={mapping.typeCol !== undefined ? String(mapping.typeCol) : "-1"}
                  onChange={(e) => setMapping({ ...mapping, typeCol: parseInt(e.target.value, 10) })}
                  options={columnOptions}
                  hint="invoice, expense, or refund"
                />
              )}
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button variant="primary" size="sm" onClick={() => setStep(3)}>
                Preview Rows ({parsedRows.length})
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Preview & Confirm */}
        {step === 3 && validationResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">
                  Data Verification Preview
                </h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  {validationResult.kind === "bank"
                    ? `${validationResult.itemsCount} transactions ready to import`
                    : `${validationResult.itemsCount} ledger entries ready to import`}
                </p>
              </div>
              {validationResult.errorsCount > 0 && (
                <Badge variant="warning" size="sm">
                  {validationResult.errorsCount} skipped row(s)
                </Badge>
              )}
            </div>

            {/* Preview table (first 5 rows) */}
            <div className="border border-[var(--border-default)] rounded-xl overflow-hidden bg-[var(--surface-primary)]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)]">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-[var(--text-tertiary)]">Date</th>
                    <th className="px-3 py-2 font-semibold text-[var(--text-tertiary)]">Party / Vendor</th>
                    <th className="px-3 py-2 font-semibold text-[var(--text-tertiary)] text-right">Amount</th>
                    <th className="px-3 py-2 font-semibold text-[var(--text-tertiary)]">Memo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {parsedRows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="hover:bg-[var(--surface-secondary)]/30">
                      <td className="px-3 py-2 font-mono text-[var(--text-secondary)]">
                        {row[mapping.dateCol] || "—"}
                      </td>
                      <td className="px-3 py-2 font-semibold text-[var(--text-primary)]">
                        {mapping.payeeCol !== -1 ? row[mapping.payeeCol] || "—" : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-[var(--text-primary)]">
                        {selectedCurrency} {mapping.amountCol !== -1 ? row[mapping.amountCol] : "0.00"}
                      </td>
                      <td className="px-3 py-2 font-mono text-[var(--text-tertiary)] truncate max-w-[160px]">
                        {mapping.memoCol !== undefined && mapping.memoCol !== -1 ? row[mapping.memoCol] || "—" : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 5 && (
                <div className="bg-[var(--surface-secondary)]/40 px-3 py-2 text-center text-xs text-[var(--text-tertiary)] border-t border-[var(--border-subtle)]">
                  + {parsedRows.length - 5} more records will be imported
                </div>
              )}
            </div>

            {/* Post-import toggle */}
            <label className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/30 cursor-pointer">
              <input
                type="checkbox"
                checked={runReconAfter}
                onChange={(e) => setRunReconAfter(e.target.checked)}
                className="h-4 w-4 rounded text-[var(--color-primary-600)] focus:ring-[var(--color-primary-500)]"
              />
              <div className="text-xs">
                <span className="font-bold text-[var(--text-primary)] block">
                  Automatically run AI reconciliation on newly imported data
                </span>
                <span className="text-[var(--text-secondary)] block">
                  Runs cosine embeddings and rules to match transactions instantly.
                </span>
              </div>
            </label>

            {importStatus && (
              <div className="p-3 rounded-xl bg-[var(--color-primary-500)]/10 text-[var(--color-primary-600)] text-xs font-semibold text-center animate-pulse">
                {importStatus}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)} disabled={isSubmitting}>
                Back to Mapping
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleImportSubmit}
                loading={isSubmitting}
                icon={
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                }
              >
                Confirm & Import Records
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
