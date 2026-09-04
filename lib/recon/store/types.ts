import type {
  Candidate,
  LedgerEntry,
  Match,
  MatchMethod,
  ReconConfig,
  Transaction,
  TransactionStatus,
  VendorPattern,
} from "../types";

export interface NewTransaction extends Omit<Transaction, "id" | "createdAt" | "embedding" | "modelVersion" | "status"> {
  /** Aggregator-side id; ingestion is idempotent on (orgId, externalId). */
  externalId: string | null;
  status?: TransactionStatus;
}

export interface NewLedgerEntry extends Omit<LedgerEntry, "id" | "createdAt" | "embedding" | "modelVersion"> {
  externalId?: string | null;
}

export interface NewMatch {
  orgId: string;
  transactionId: string;
  ledgerEntryId: string | null;
  confidenceScore: number | null;
  matchMethod: MatchMethod;
  matchedBy: string;
  rationale: string | null;
}

export interface Notification {
  id: string;
  orgId: string;
  kind: "anomaly" | "low_confidence" | "forecast_update";
  transactionId: string | null;
  message: string;
  readAt: string | null;
  createdAt: string;
}

/**
 * Every method is org-scoped by argument. RLS enforces the same boundary at the
 * database layer, so an omitted filter here still cannot cross tenants.
 */
export interface ReconStore {
  getConfig(orgId: string): Promise<ReconConfig>;
  saveConfig(orgId: string, overrides: Partial<ReconConfig>): Promise<ReconConfig>;

  upsertTransactions(orgId: string, transactions: NewTransaction[]): Promise<Transaction[]>;
  insertLedgerEntries(orgId: string, entries: NewLedgerEntry[]): Promise<LedgerEntry[]>;

  getTransaction(orgId: string, transactionId: string): Promise<Transaction | null>;
  listTransactions(
    orgId: string,
    filter?: { status?: TransactionStatus; limit?: number }
  ): Promise<Transaction[]>;
  listVendorHistory(orgId: string, vendorKey: string): Promise<Transaction[]>;

  getLedgerEntry(orgId: string, ledgerEntryId: string): Promise<LedgerEntry | null>;
  /** Ledger entries with no match recorded against them yet. */
  listOpenLedgerEntries(orgId: string): Promise<LedgerEntry[]>;
  /**
   * Index-backed top-K similarity search. Optional: stores without a vector
   * index fall back to ranking listOpenLedgerEntries in process.
   */
  searchCandidates?(
    orgId: string,
    embedding: number[],
    topK: number
  ): Promise<Candidate[]>;

  setTransactionEmbedding(
    orgId: string,
    transactionId: string,
    embedding: number[],
    modelVersion: string,
    sourceHash: string
  ): Promise<void>;
  setLedgerEmbedding(
    orgId: string,
    ledgerEntryId: string,
    embedding: number[],
    modelVersion: string,
    sourceHash: string
  ): Promise<void>;
  setTransactionStatus(
    orgId: string,
    transactionId: string,
    status: TransactionStatus
  ): Promise<void>;

  insertMatch(match: NewMatch): Promise<Match>;
  listMatches(orgId: string, transactionId?: string): Promise<Match[]>;

  getVendorPattern(orgId: string, vendorName: string): Promise<VendorPattern | null>;
  upsertVendorPattern(pattern: Omit<VendorPattern, "id">): Promise<VendorPattern>;

  insertNotification(
    notification: Omit<Notification, "id" | "createdAt" | "readAt">
  ): Promise<Notification>;
  listNotifications(orgId: string, limit?: number): Promise<Notification[]>;
}
