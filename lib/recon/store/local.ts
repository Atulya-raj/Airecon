import fs from "fs";
import path from "path";
import { createId } from "@paralleldrive/cuid2";
import { resolveConfig } from "../config";
import { vendorKey } from "../anomaly";
import type {
  LedgerEntry,
  Match,
  ReconConfig,
  ReconciledFlow,
  Transaction,
  TransactionStatus,
  VendorPattern,
} from "../types";
import type {
  NewLedgerEntry,
  NewMatch,
  NewTransaction,
  Notification,
  ReconStore,
} from "./types";

interface Snapshot {
  configs: Record<string, Partial<ReconConfig>>;
  transactions: (Transaction & { externalId: string | null; sourceHash: string | null })[];
  ledgerEntries: (LedgerEntry & { sourceHash: string | null })[];
  matches: Match[];
  vendorPatterns: VendorPattern[];
  notifications: Notification[];
}

const EMPTY: Snapshot = {
  configs: {},
  transactions: [],
  ledgerEntries: [],
  matches: [],
  vendorPatterns: [],
  notifications: [],
};

/**
 * File-backed (or purely in-memory) store used for local development and
 * tests, so the pipeline runs without Supabase. Mirrors the semantics the
 * Postgres store gets from constraints: idempotent ingestion and append-only
 * matches.
 */
export class LocalReconStore implements ReconStore {
  private data: Snapshot;

  constructor(private readonly filePath: string | null = null) {
    this.data = this.load();
  }

  async getConfig(orgId: string): Promise<ReconConfig> {
    return resolveConfig(orgId, this.data.configs[orgId] ?? {});
  }

  async saveConfig(orgId: string, overrides: Partial<ReconConfig>): Promise<ReconConfig> {
    this.data.configs[orgId] = { ...this.data.configs[orgId], ...overrides };
    this.persist();
    return this.getConfig(orgId);
  }

  async upsertTransactions(
    orgId: string,
    transactions: NewTransaction[]
  ): Promise<Transaction[]> {
    const result: Transaction[] = [];
    for (const input of transactions) {
      const existing = input.externalId
        ? this.data.transactions.find(
            (t) => t.orgId === orgId && t.externalId === input.externalId
          )
        : undefined;
      if (existing) {
        result.push(existing);
        continue;
      }
      const row = {
        ...input,
        orgId,
        id: createId(),
        embedding: null,
        modelVersion: null,
        sourceHash: null,
        status: input.status ?? ("unmatched" as TransactionStatus),
        createdAt: new Date().toISOString(),
      };
      this.data.transactions.push(row);
      result.push(row);
    }
    this.persist();
    return result;
  }

  async insertLedgerEntries(
    orgId: string,
    entries: NewLedgerEntry[]
  ): Promise<LedgerEntry[]> {
    const rows = entries.map((entry) => ({
      ...entry,
      orgId,
      id: createId(),
      embedding: null,
      modelVersion: null,
      sourceHash: null,
      createdAt: new Date().toISOString(),
    }));
    this.data.ledgerEntries.push(...rows);
    this.persist();
    return rows;
  }

  async getTransaction(orgId: string, transactionId: string): Promise<Transaction | null> {
    return (
      this.data.transactions.find((t) => t.orgId === orgId && t.id === transactionId) ??
      null
    );
  }

  async listTransactions(
    orgId: string,
    filter: { status?: TransactionStatus; limit?: number } = {}
  ): Promise<Transaction[]> {
    return this.data.transactions
      .filter((t) => t.orgId === orgId)
      .filter((t) => (filter.status ? t.status === filter.status : true))
      .sort((a, b) => b.txnDate.localeCompare(a.txnDate))
      .slice(0, filter.limit ?? 200);
  }

  async listVendorHistory(orgId: string, vendor: string): Promise<Transaction[]> {
    const key = vendorKey(vendor);
    return this.data.transactions.filter(
      (t) => t.orgId === orgId && vendorKey(t.payeeRaw) === key
    );
  }

  async getLedgerEntry(orgId: string, ledgerEntryId: string): Promise<LedgerEntry | null> {
    return (
      this.data.ledgerEntries.find((l) => l.orgId === orgId && l.id === ledgerEntryId) ??
      null
    );
  }

  async listOpenLedgerEntries(orgId: string): Promise<LedgerEntry[]> {
    const matched = new Set(
      this.data.matches
        .filter((m) => m.orgId === orgId && m.ledgerEntryId)
        .map((m) => m.ledgerEntryId as string)
    );
    return this.data.ledgerEntries.filter(
      (l) => l.orgId === orgId && !matched.has(l.id)
    );
  }

  async setTransactionEmbedding(
    orgId: string,
    transactionId: string,
    embedding: number[],
    modelVersion: string,
    hash: string
  ): Promise<void> {
    const row = this.data.transactions.find(
      (t) => t.orgId === orgId && t.id === transactionId
    );
    if (!row) return;
    row.embedding = embedding;
    row.modelVersion = modelVersion;
    row.sourceHash = hash;
    this.persist();
  }

  async setLedgerEmbedding(
    orgId: string,
    ledgerEntryId: string,
    embedding: number[],
    modelVersion: string,
    hash: string
  ): Promise<void> {
    const row = this.data.ledgerEntries.find(
      (l) => l.orgId === orgId && l.id === ledgerEntryId
    );
    if (!row) return;
    row.embedding = embedding;
    row.modelVersion = modelVersion;
    row.sourceHash = hash;
    this.persist();
  }

  async setTransactionStatus(
    orgId: string,
    transactionId: string,
    status: TransactionStatus
  ): Promise<void> {
    const row = this.data.transactions.find(
      (t) => t.orgId === orgId && t.id === transactionId
    );
    if (!row) return;
    row.status = status;
    this.persist();
  }

  async insertMatch(match: NewMatch): Promise<Match> {
    const row: Match = {
      ...match,
      id: createId(),
      createdAt: new Date().toISOString(),
    };
    this.data.matches.push(row);
    this.persist();
    return row;
  }

  async listMatches(orgId: string, transactionId?: string): Promise<Match[]> {
    return this.data.matches
      .filter((m) => m.orgId === orgId)
      .filter((m) => (transactionId ? m.transactionId === transactionId : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getVendorPattern(orgId: string, vendorName: string): Promise<VendorPattern | null> {
    const key = vendorKey(vendorName);
    return (
      this.data.vendorPatterns.find(
        (p) => p.orgId === orgId && vendorKey(p.vendorName) === key
      ) ?? null
    );
  }

  async upsertVendorPattern(pattern: Omit<VendorPattern, "id">): Promise<VendorPattern> {
    const key = vendorKey(pattern.vendorName);
    const existing = this.data.vendorPatterns.find(
      (p) => p.orgId === pattern.orgId && vendorKey(p.vendorName) === key
    );
    if (existing) {
      Object.assign(existing, pattern);
      this.persist();
      return existing;
    }
    const row: VendorPattern = { ...pattern, id: createId() };
    this.data.vendorPatterns.push(row);
    this.persist();
    return row;
  }

  async insertNotification(
    notification: Omit<Notification, "id" | "createdAt" | "readAt">
  ): Promise<Notification> {
    const row: Notification = {
      ...notification,
      id: createId(),
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    this.data.notifications.push(row);
    this.persist();
    return row;
  }

  async listVendorPatterns(orgId: string): Promise<VendorPattern[]> {
    return this.data.vendorPatterns
      .filter((p) => p.orgId === orgId)
      .sort((a, b) => b.sampleSize - a.sampleSize);
  }

  async listReconciledFlows(orgId: string): Promise<ReconciledFlow[]> {
    const matchedTxns = this.data.transactions.filter(
      (t) => t.orgId === orgId && (t.status === "auto_matched" || t.status === "reviewed")
    );

    const ledgerMap = new Map(this.data.ledgerEntries.map((l) => [l.id, l]));
    const matchesByTxn = new Map(this.data.matches.map((m) => [m.transactionId, m]));

    return matchedTxns
      .map((t) => {
        const match = matchesByTxn.get(t.id);
        const entry = match?.ledgerEntryId ? ledgerMap.get(match.ledgerEntryId) : null;
        const isInflow =
          entry?.entryType === "invoice" ||
          entry?.entryType === "refund" ||
          t.memo?.toLowerCase().includes("wire in") ||
          t.memo?.toLowerCase().includes("deposit");

        return {
          date: t.txnDate,
          amount: Math.abs(t.amount),
          type: (isInflow ? "inflow" : "outflow") as "inflow" | "outflow",
          description: t.payeeRaw ?? t.memo ?? "Reconciled item",
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async listNotifications(orgId: string, limit = 50): Promise<Notification[]> {
    return this.data.notifications
      .filter((n) => n.orgId === orgId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  private load(): Snapshot {
    if (!this.filePath || !fs.existsSync(this.filePath)) {
      return structuredClone(EMPTY);
    }
    try {
      return { ...structuredClone(EMPTY), ...JSON.parse(fs.readFileSync(this.filePath, "utf8")) };
    } catch (error) {
      console.error("Failed to read local recon store, starting empty:", error);
      return structuredClone(EMPTY);
    }
  }

  private persist(): void {
    if (!this.filePath) return;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }
}
