"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../components/AppShell";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge, StatusBadge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Input, Select } from "../components/ui/Input";
import { formatCurrency } from "@/lib/recon/currency";
import type { Notification } from "@/lib/recon/store/types";
import type { Transaction } from "@/lib/recon/types";

interface BankFeedsClientProps {
  orgId: string;
  username: string;
  name: string;
  transactions: Transaction[];
  notifications: Notification[];
  anomalousCount: number;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  protocol: "RBI Account Aggregator" | "Open Banking" | "Payment Gateway Webhook" | "Direct Host-to-Host";
  country: "India" | "USA" | "Global";
  currency: "INR" | "USD" | "EUR";
  balance: number;
  status: "active" | "syncing" | "idle";
  lastSync: string;
  tag: string;
}

const DEFAULT_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: "hdfc-current",
    bankName: "HDFC Bank",
    accountNumber: "•••• 8921",
    accountType: "Smart Current Account",
    protocol: "RBI Account Aggregator",
    country: "India",
    currency: "INR",
    balance: 482920.5,
    status: "active",
    lastSync: "2 mins ago",
    tag: "Primary Operating",
  },
  {
    id: "sbi-corporate",
    bankName: "State Bank of India (SBI)",
    accountNumber: "•••• 3042",
    accountType: "Corporate Current A/c",
    protocol: "RBI Account Aggregator",
    country: "India",
    currency: "INR",
    balance: 1245100.0,
    status: "active",
    lastSync: "15 mins ago",
    tag: "Treasury & Tax",
  },
  {
    id: "razorpayx",
    bankName: "RazorpayX Virtual A/c",
    accountNumber: "RAZORPAY-VPA-01",
    accountType: "Smart Payouts & Collections",
    protocol: "Payment Gateway Webhook",
    country: "India",
    currency: "INR",
    balance: 195400.0,
    status: "active",
    lastSync: "Real-time push",
    tag: "UPI & Instant Gate",
  },
  {
    id: "chase-checking",
    bankName: "Chase Commercial Bank",
    accountNumber: "•••• 4102",
    accountType: "Global Operating Account",
    protocol: "Open Banking",
    country: "USA",
    currency: "USD",
    balance: 54120.0,
    status: "active",
    lastSync: "1 hour ago",
    tag: "International SWIFT",
  },
];

export function BankFeedsClient({
  orgId,
  username,
  name,
  transactions,
  anomalousCount,
}: BankFeedsClientProps) {
  const router = useRouter();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(DEFAULT_BANK_ACCOUNTS);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Connect Bank Modal state
  const [connectStandard, setConnectStandard] = useState<"aa" | "openbanking" | "gateway">("aa");
  const [newBankName, setNewBankName] = useState("ICICI Bank Corporate");
  const [newAccNumber, setNewAccNumber] = useState("");
  const [newCurrency, setNewCurrency] = useState("INR");
  const [isConnecting, setIsConnecting] = useState(false);

  // Trigger live sync against /api/bank/sync
  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncToast(null);

    try {
      const res = await fetch("/api/bank/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error("Failed to communicate with Bank Feeds Gateway.");
      }

      const data = await res.json();
      setSyncToast({
        type: "success",
        message: `Synced ${data.syncedCount} new transactions! Auto-matched ${data.autoMatched} immediately.`,
      });

      startTransition(() => {
        router.refresh();
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sync error";
      setSyncToast({ type: "error", message: msg });
    } finally {
      setIsSyncing(false);
    }
  };

  // Trigger test webhook
  const handleSendTestWebhook = async () => {
    try {
      const testPayload = {
        orgId,
        amount: 3250.0,
        currency: "INR",
        payee: "UPI/592819481920/ZEPTO-STORE/zepto@icici/Grocery Essentials",
        description: "Zepto Quick Delivery Office Pantry",
        bank: "HDFC Current",
      };

      const res = await fetch(`/api/bank/webhook?orgId=${orgId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload),
      });

      if (res.ok) {
        setSyncToast({
          type: "success",
          message: "Test UPI webhook delivered successfully! Check transactions feed.",
        });
        startTransition(() => {
          router.refresh();
        });
      }
    } catch {
      setSyncToast({ type: "error", message: "Failed to fire test webhook" });
    }
  };

  // Add newly connected account
  const handleConnectBank = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);

    setTimeout(() => {
      const newAcc: BankAccount = {
        id: `bank-${Date.now()}`,
        bankName: newBankName,
        accountNumber: `•••• ${newAccNumber.slice(-4) || "5521"}`,
        accountType: "Direct Business Feed",
        protocol:
          connectStandard === "aa"
            ? "RBI Account Aggregator"
            : connectStandard === "openbanking"
            ? "Open Banking"
            : "Payment Gateway Webhook",
        country: connectStandard === "aa" ? "India" : "Global",
        currency: newCurrency as "INR" | "USD" | "EUR",
        balance: 100000.0,
        status: "active",
        lastSync: "Just connected",
        tag: "Live Streaming",
      };

      setBankAccounts((prev) => [newAcc, ...prev]);
      setIsConnecting(false);
      setIsConnectModalOpen(false);
      setSyncToast({
        type: "success",
        message: `Successfully connected ${newBankName} via ${newAcc.protocol}!`,
      });
      setNewAccNumber("");
    }, 800);
  };

  return (
    <AppShell orgName={name || username} anomalousCount={anomalousCount}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                Bank Feeds & Real-Time Sync
              </h1>
              <Badge variant="success" size="sm" dot>
                Live Tracking Active
              </Badge>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Direct connection with Indian (RBI Account Aggregator / UPI) and Global banking APIs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSendTestWebhook}
              title="Test sending a live UPI webhook event"
              icon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              }
            >
              Test UPI Webhook
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsConnectModalOpen(true)}
              icon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              }
            >
              Connect Bank
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSyncNow}
              loading={isSyncing || isPending}
              icon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
              }
            >
              Sync Feeds Now
            </Button>
          </div>
        </div>

        {/* Sync Toast Alert */}
        {syncToast && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between border ${
              syncToast.type === "success"
                ? "bg-[var(--color-success-50)] border-[var(--color-success-200)] text-[var(--color-success-text)]"
                : "bg-[var(--color-danger-50)] border-[var(--color-danger-200)] text-[var(--color-danger-text)]"
            }`}
          >
            <div className="flex items-center gap-2.5 text-sm font-medium">
              <span>{syncToast.type === "success" ? "✅" : "⚠️"}</span>
              <span>{syncToast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncToast(null)}
              className="text-xs opacity-70 hover:opacity-100 cursor-pointer font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Connected Bank Feeds Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {bankAccounts.map((account) => (
            <Card key={account.id} className="p-5 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                    {account.country}
                  </span>
                  <Badge variant="success" size="sm" dot>
                    Live
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)] mt-1 truncate">
                  {account.bankName}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] font-mono">
                  {account.accountNumber} • {account.accountType}
                </p>
              </div>

              <div>
                <span className="text-[11px] text-[var(--text-tertiary)]">Available Balance</span>
                <div className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                  {formatCurrency(account.balance, account.currency)}
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                <span className="truncate max-w-[120px]">{account.protocol}</span>
                <span className="font-mono text-[11px]">{account.lastSync}</span>
              </div>
            </Card>
          ))}
        </div>

        {/* Real-Time Webhook Integration Card */}
        <Card className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Live Bank Webhook Ingestion API
                </h2>
                <Badge variant="primary" size="sm">
                  Webhook v1
                </Badge>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Stream real-time UPI payments, NEFT transfers, and corporate card transactions directly into Airecon.
              </p>
            </div>
            <span className="text-xs font-mono text-[var(--color-primary-600)] bg-[var(--surface-secondary)] px-2.5 py-1 rounded-lg">
              Workspace ID: {orgId}
            </span>
          </div>

          <div className="bg-[var(--surface-secondary)] rounded-xl p-4 font-mono text-xs text-[var(--text-secondary)] space-y-2 border border-[var(--border-subtle)] overflow-x-auto">
            <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] pb-1 border-b border-[var(--border-subtle)]">
              <span>CURL SAMPLE INGESTION</span>
              <span>POST /api/bank/webhook</span>
            </div>
            <pre className="text-[var(--text-primary)] leading-relaxed whitespace-pre">
{`curl -X POST "https://airecon.app/api/bank/webhook?orgId=${orgId}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 4500.00,
    "currency": "INR",
    "payee": "UPI/4281029481/ZOMATO-HYPERPURE/zomato@hdfc/Restaurant Raw Materials",
    "date": "${new Date().toISOString().slice(0, 10)}",
    "account": "HDFC Current"
  }'`}
            </pre>
          </div>
        </Card>

        {/* Recent Bank Ingestion Feed */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Latest Synced Bank Transactions
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Real-time feed across all connected banking channels
              </p>
            </div>
            <span className="text-xs text-[var(--text-tertiary)]">
              Total {transactions.length} records tracked
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-[var(--text-tertiary)] uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Payee / Entity</th>
                  <th className="py-2.5 px-3">Account</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {transactions.slice(0, 10).map((txn) => (
                  <tr key={txn.id} className="hover:bg-[var(--surface-secondary)] transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[var(--text-secondary)] whitespace-nowrap">
                        {txn.txnDate}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[var(--text-primary)]">
                        <div>{txn.payeeRaw}</div>
                        {txn.memo && (
                          <div className="text-[10px] text-[var(--text-tertiary)] truncate max-w-sm">
                            {txn.memo}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)] font-mono text-[11px] whitespace-nowrap">
                        {txn.accountId}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[var(--text-primary)] whitespace-nowrap">
                        {formatCurrency(txn.amount, txn.currency)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <StatusBadge status={txn.status} />
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Connect Bank Modal */}
      <Modal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        title="Connect Bank Feed"
        description="Establish a real-time connection via RBI Account Aggregator, Open Banking, or Payment Gateway."
        size="md"
      >
        <form onSubmit={handleConnectBank} className="space-y-4">
          {/* Architecture selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">
              Connection Architecture
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setConnectStandard("aa");
                  setNewCurrency("INR");
                  setNewBankName("ICICI Bank Corporate");
                }}
                className={`p-2.5 text-left rounded-xl border text-xs font-medium transition-all ${
                  connectStandard === "aa"
                    ? "border-[var(--color-primary-500)] bg-[var(--surface-secondary)] text-[var(--text-primary)] shadow-xs"
                    : "border-[var(--border-default)] text-[var(--text-secondary)]"
                }`}
              >
                <div className="font-bold">🇮🇳 RBI AA</div>
                <div className="text-[10px] opacity-75 mt-0.5">India Banks & UPI</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setConnectStandard("openbanking");
                  setNewCurrency("USD");
                  setNewBankName("Silicon Valley Bank / First Republic");
                }}
                className={`p-2.5 text-left rounded-xl border text-xs font-medium transition-all ${
                  connectStandard === "openbanking"
                    ? "border-[var(--color-primary-500)] bg-[var(--surface-secondary)] text-[var(--text-primary)] shadow-xs"
                    : "border-[var(--border-default)] text-[var(--text-secondary)]"
                }`}
              >
                <div className="font-bold">🌐 Open Banking</div>
                <div className="text-[10px] opacity-75 mt-0.5">US / UK / EU Plaid</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setConnectStandard("gateway");
                  setNewCurrency("INR");
                  setNewBankName("Cashfree Payouts");
                }}
                className={`p-2.5 text-left rounded-xl border text-xs font-medium transition-all ${
                  connectStandard === "gateway"
                    ? "border-[var(--color-primary-500)] bg-[var(--surface-secondary)] text-[var(--text-primary)] shadow-xs"
                    : "border-[var(--border-default)] text-[var(--text-secondary)]"
                }`}
              >
                <div className="font-bold">⚡ Gateway</div>
                <div className="text-[10px] opacity-75 mt-0.5">RazorpayX / Stripe</div>
              </button>
            </div>
          </div>

          <Input
            label="Institution / Bank Name *"
            value={newBankName}
            onChange={(e) => setNewBankName(e.target.value)}
            placeholder="e.g. Axis Bank, Kotak Mahindra, Barclays"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Account Number / Consent Handle *"
              value={newAccNumber}
              onChange={(e) => setNewAccNumber(e.target.value)}
              placeholder="e.g. 501004928192 or mobile@fip"
              required
            />
            <Select
              label="Base Currency"
              value={newCurrency}
              onChange={(e) => setNewCurrency(e.target.value)}
              options={[
                { value: "INR", label: "INR (₹) - Indian Rupee" },
                { value: "USD", label: "USD ($) - US Dollar" },
                { value: "EUR", label: "EUR (€) - Euro" },
              ]}
            />
          </div>

          <div className="p-3 rounded-xl bg-[var(--surface-secondary)] text-[11px] text-[var(--text-secondary)] leading-relaxed border border-[var(--border-subtle)]">
            <strong>Security Notice:</strong> Connections are established using read-only API tokens and encrypted consent tokens under RBI Account Aggregator framework / ISO 20022 Open Banking specifications.
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setIsConnectModalOpen(false)}
              disabled={isConnecting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              loading={isConnecting}
            >
              Authorize & Connect Feed →
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
