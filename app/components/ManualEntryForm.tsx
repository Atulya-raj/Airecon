"use client";

import React, { useState } from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Input, Select } from "./ui/Input";
import {
  createManualTransactionAction,
  createManualLedgerEntryAction,
} from "../actions";

interface ManualEntryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ManualEntryForm({ isOpen, onClose, onSuccess }: ManualEntryFormProps) {
  const [entryKind, setEntryKind] = useState<"bank" | "ledger">("bank");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [payeeOrVendor, setPayeeOrVendor] = useState("");
  const [memo, setMemo] = useState("");
  const [accountId, setAccountId] = useState("hdfc-current");
  const [entryType, setEntryType] = useState("expense");
  const [taxId, setTaxId] = useState("");
  const [paymentMode, setPaymentMode] = useState("UPI");

  const resetForm = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setAmount("");
    setPayeeOrVendor("");
    setMemo("");
    setTaxId("");
    setPaymentMode("UPI");
    setErrorMsg(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("Please enter a valid amount greater than zero.");
      return;
    }

    if (!payeeOrVendor.trim()) {
      setErrorMsg(entryKind === "bank" ? "Please enter a payee name." : "Please enter a vendor/client name.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("amount", amount);
      formData.append("currency", currency);

      // Assemble enriched memo with tax ID & payment mode if supplied
      let fullMemo = memo.trim();
      if (entryKind === "bank" && paymentMode) {
        fullMemo = fullMemo ? `${fullMemo} [Mode: ${paymentMode}]` : `[Mode: ${paymentMode}]`;
      }
      if (taxId.trim()) {
        fullMemo = fullMemo ? `${fullMemo} [Tax ID/GSTIN: ${taxId.trim().toUpperCase()}]` : `[Tax ID/GSTIN: ${taxId.trim().toUpperCase()}]`;
      }
      formData.append("memo", fullMemo);

      if (entryKind === "bank") {
        formData.append("txnDate", date);
        formData.append("payeeRaw", payeeOrVendor);
        formData.append("accountId", accountId);

        const result = await createManualTransactionAction(formData);
        if (!result.success) {
          throw new Error(result.error || "Failed to create transaction");
        }
      } else {
        formData.append("entryDate", date);
        formData.append("vendorName", payeeOrVendor);
        formData.append("entryType", entryType);

        const result = await createManualLedgerEntryAction(formData);
        if (!result.success) {
          throw new Error(result.error || "Failed to create ledger entry");
        }
      }

      handleClose();
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      setErrorMsg(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Manual Financial Record"
      description="Record an unlisted bank transaction or create an open ledger entry."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Record Type Selector */}
        <div className="flex rounded-xl bg-[var(--surface-secondary)] p-1">
          <button
            type="button"
            onClick={() => setEntryKind("bank")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              entryKind === "bank"
                ? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Bank Transaction
          </button>
          <button
            type="button"
            onClick={() => setEntryKind("ledger")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              entryKind === "ledger"
                ? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Ledger Entry (Invoice/Expense)
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-[var(--color-danger-50)] text-[var(--color-danger-text)] text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Amount & Currency */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Input
              label="Amount *"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <Select
              label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={[
                { value: "INR", label: "INR (₹)" },
                { value: "USD", label: "USD ($)" },
                { value: "EUR", label: "EUR (€)" },
                { value: "GBP", label: "GBP (£)" },
              ]}
            />
          </div>
        </div>

        {/* Date & Account / Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Date *"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          {entryKind === "bank" ? (
            <Select
              label="Bank Account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              options={[
                { value: "hdfc-current", label: "HDFC Bank Current (•••• 8921)" },
                { value: "sbi-corporate", label: "SBI Corporate A/c (•••• 3042)" },
                { value: "razorpayx", label: "RazorpayX Payout Account" },
                { value: "chase-checking", label: "Chase Operating (•••• 4102)" },
                { value: "petty-cash", label: "Cash / Direct Vault" },
              ]}
            />
          ) : (
            <Select
              label="Entry Classification"
              value={entryType}
              onChange={(e) => setEntryType(e.target.value)}
              options={[
                { value: "expense", label: "Expense / Bill" },
                { value: "invoice", label: "Customer Invoice / Income" },
                { value: "refund", label: "Credit Refund" },
              ]}
            />
          )}
        </div>

        {/* Bank-specific Payment Mode */}
        {entryKind === "bank" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Payment Channel / Mode"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              options={[
                { value: "UPI", label: "UPI (Google Pay, PhonePe, Paytm)" },
                { value: "NEFT", label: "NEFT / RTGS Bank Transfer" },
                { value: "IMPS", label: "IMPS Instant Transfer" },
                { value: "CARD", label: "Corporate Card / POS" },
                { value: "ACH_WIRE", label: "Wire / International Swift" },
              ]}
            />
            <Input
              label="GSTIN / Tax ID (Optional)"
              placeholder="e.g. 27AAAAA0000A1Z5 or US EIN"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
            />
          </div>
        )}

        {/* Payee / Vendor Name */}
        <Input
          label={entryKind === "bank" ? "Payee / Merchant Name *" : "Vendor or Client Name *"}
          placeholder={entryKind === "bank" ? "e.g. Amazon Web Services, Swiggy, Infosys Ltd" : "e.g. Razorpay, Google Cloud, TechConsult India"}
          value={payeeOrVendor}
          onChange={(e) => setPayeeOrVendor(e.target.value)}
          required
        />

        {/* Memo / Notes & Tax ID for ledger */}
        <div className={entryKind === "ledger" ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : ""}>
          <Input
            label="Memo / Invoice Number (Optional)"
            placeholder="e.g. INV-2026-091, Monthly cloud hosting"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
          {entryKind === "ledger" && (
            <Input
              label="Vendor GSTIN / Tax ID"
              placeholder="e.g. 07AAAAA0000A1Z5"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
            />
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
          <Button variant="ghost" size="sm" type="button" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            loading={isSubmitting}
            icon={
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
            }
          >
            Save Record
          </Button>
        </div>
      </form>
    </Modal>
  );
}
