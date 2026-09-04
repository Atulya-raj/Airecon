import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveConfig } from "../config";
import type {
  Candidate,
  Currency,
  LedgerEntry,
  LedgerEntryType,
  Match,
  MatchMethod,
  ReconConfig,
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

interface TransactionRow {
  id: string;
  org_id: string;
  account_id: string;
  external_id: string | null;
  amount: string | number;
  currency: string;
  txn_date: string;
  payee_raw: string | null;
  memo: string | null;
  embedding: number[] | string | null;
  model_version: string | null;
  status: string;
  created_at: string;
}

interface LedgerRow {
  id: string;
  org_id: string;
  entry_type: string;
  amount: string | number;
  currency: string;
  vendor_name: string | null;
  memo: string | null;
  entry_date: string;
  embedding?: number[] | string | null;
  model_version: string | null;
  created_at?: string;
}

interface MatchRow {
  id: string;
  org_id: string;
  transaction_id: string;
  ledger_entry_id: string | null;
  confidence_score: string | number | null;
  match_method: string;
  matched_by: string;
  rationale: string | null;
  created_at: string;
}

interface VendorPatternRow {
  id: string;
  org_id: string;
  vendor_name: string;
  avg_amount: string | number | null;
  amount_stddev: string | number | null;
  typical_interval_days: string | number | null;
  sample_size: number;
  last_updated: string;
}

interface NotificationRow {
  id: string;
  org_id: string;
  kind: string;
  transaction_id: string | null;
  message: string;
  read_at: string | null;
  created_at: string;
}

interface ConfigRow {
  auto_match_threshold: number | null;
  ambiguous_band_floor: number | null;
  top_k: number | null;
  tie_epsilon: number | null;
  amount_tolerance_pct: number | null;
  amount_tolerance_flat: number | null;
  date_window_days: number | null;
  anomaly_z_score_threshold: number | null;
  anomaly_interval_factor: number | null;
  rule_match_confidence: number | null;
}

export class SupabaseReconStore implements ReconStore {
  constructor(private readonly client: SupabaseClient) {}

  async getConfig(orgId: string): Promise<ReconConfig> {
    const { data } = await this.client
      .from("recon_org_config")
      .select("*")
      .eq("org_id", orgId)
      .maybeSingle();
    return resolveConfig(orgId, data ? configFromRow(data as ConfigRow) : {});
  }

  async saveConfig(orgId: string, overrides: Partial<ReconConfig>): Promise<ReconConfig> {
    const { error } = await this.client.from("recon_org_config").upsert({
      org_id: orgId,
      ...configToRow(overrides),
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return this.getConfig(orgId);
  }

  async upsertTransactions(
    orgId: string,
    transactions: NewTransaction[]
  ): Promise<Transaction[]> {
    if (transactions.length === 0) return [];
    const { data, error } = await this.client
      .from("transactions")
      .upsert(
        transactions.map((t) => ({
          org_id: orgId,
          account_id: t.accountId,
          external_id: t.externalId,
          amount: t.amount,
          currency: t.currency,
          txn_date: t.txnDate,
          payee_raw: t.payeeRaw,
          memo: t.memo,
          status: t.status ?? "unmatched",
        })),
        { onConflict: "org_id,external_id", ignoreDuplicates: false }
      )
      .select();
    if (error) throw new Error(error.message);
    return (data as TransactionRow[]).map(toTransaction);
  }

  async insertLedgerEntries(
    orgId: string,
    entries: NewLedgerEntry[]
  ): Promise<LedgerEntry[]> {
    if (entries.length === 0) return [];
    const { data, error } = await this.client
      .from("ledger_entries")
      .insert(
        entries.map((e) => ({
          org_id: orgId,
          entry_type: e.entryType,
          amount: e.amount,
          currency: e.currency,
          vendor_name: e.vendorName,
          memo: e.memo,
          entry_date: e.entryDate,
        }))
      )
      .select();
    if (error) throw new Error(error.message);
    return (data as LedgerRow[]).map(toLedgerEntry);
  }

  async getTransaction(orgId: string, transactionId: string): Promise<Transaction | null> {
    const { data } = await this.client
      .from("transactions")
      .select("*")
      .eq("org_id", orgId)
      .eq("id", transactionId)
      .maybeSingle();
    return data ? toTransaction(data as TransactionRow) : null;
  }

  async listTransactions(
    orgId: string,
    filter: { status?: TransactionStatus; limit?: number } = {}
  ): Promise<Transaction[]> {
    let query = this.client
      .from("transactions")
      .select("*")
      .eq("org_id", orgId)
      .order("txn_date", { ascending: false })
      .limit(filter.limit ?? 200);
    if (filter.status) query = query.eq("status", filter.status);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data as TransactionRow[]).map(toTransaction);
  }

  async listVendorHistory(orgId: string, vendor: string): Promise<Transaction[]> {
    const { data, error } = await this.client
      .from("transactions")
      .select("*")
      .eq("org_id", orgId)
      .ilike("payee_raw", `%${vendor}%`)
      .order("txn_date", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data as TransactionRow[]).map(toTransaction);
  }

  async getLedgerEntry(orgId: string, ledgerEntryId: string): Promise<LedgerEntry | null> {
    const { data } = await this.client
      .from("ledger_entries")
      .select("*")
      .eq("org_id", orgId)
      .eq("id", ledgerEntryId)
      .maybeSingle();
    return data ? toLedgerEntry(data as LedgerRow) : null;
  }

  async listOpenLedgerEntries(orgId: string): Promise<LedgerEntry[]> {
    const { data: matched, error: matchError } = await this.client
      .from("matches")
      .select("ledger_entry_id")
      .eq("org_id", orgId)
      .not("ledger_entry_id", "is", null);
    if (matchError) throw new Error(matchError.message);

    const matchedIds = (matched as { ledger_entry_id: string }[]).map(
      (row) => row.ledger_entry_id
    );
    let query = this.client
      .from("ledger_entries")
      .select("*")
      .eq("org_id", orgId)
      .order("entry_date", { ascending: false })
      .limit(500);
    if (matchedIds.length > 0) {
      query = query.not("id", "in", `(${matchedIds.join(",")})`);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data as LedgerRow[]).map(toLedgerEntry);
  }

  async searchCandidates(
    orgId: string,
    embedding: number[],
    topK: number
  ): Promise<Candidate[]> {
    const { data, error } = await this.client.rpc("match_ledger_entries", {
      p_org_id: orgId,
      p_embedding: embedding,
      p_top_k: topK,
    });
    if (error) throw new Error(error.message);
    return (data as (LedgerRow & { score: number })[]).map((row) => ({
      ledgerEntry: toLedgerEntry(row),
      score: row.score,
    }));
  }

  async setTransactionEmbedding(
    orgId: string,
    transactionId: string,
    embedding: number[],
    modelVersion: string,
    sourceHash: string
  ): Promise<void> {
    const { error } = await this.client
      .from("transactions")
      .update({ embedding, model_version: modelVersion, source_hash: sourceHash })
      .eq("org_id", orgId)
      .eq("id", transactionId);
    if (error) throw new Error(error.message);
  }

  async setLedgerEmbedding(
    orgId: string,
    ledgerEntryId: string,
    embedding: number[],
    modelVersion: string,
    sourceHash: string
  ): Promise<void> {
    const { error } = await this.client
      .from("ledger_entries")
      .update({ embedding, model_version: modelVersion, source_hash: sourceHash })
      .eq("org_id", orgId)
      .eq("id", ledgerEntryId);
    if (error) throw new Error(error.message);
  }

  async setTransactionStatus(
    orgId: string,
    transactionId: string,
    status: TransactionStatus
  ): Promise<void> {
    const { error } = await this.client
      .from("transactions")
      .update({ status })
      .eq("org_id", orgId)
      .eq("id", transactionId);
    if (error) throw new Error(error.message);
  }

  async insertMatch(match: NewMatch): Promise<Match> {
    const { data, error } = await this.client
      .from("matches")
      .insert({
        org_id: match.orgId,
        transaction_id: match.transactionId,
        ledger_entry_id: match.ledgerEntryId,
        confidence_score: match.confidenceScore,
        match_method: match.matchMethod,
        matched_by: match.matchedBy,
        rationale: match.rationale,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toMatch(data as MatchRow);
  }

  async listMatches(orgId: string, transactionId?: string): Promise<Match[]> {
    let query = this.client
      .from("matches")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (transactionId) query = query.eq("transaction_id", transactionId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data as MatchRow[]).map(toMatch);
  }

  async getVendorPattern(orgId: string, vendorName: string): Promise<VendorPattern | null> {
    const { data } = await this.client
      .from("vendor_patterns")
      .select("*")
      .eq("org_id", orgId)
      .eq("vendor_name", vendorName)
      .maybeSingle();
    return data ? toVendorPattern(data as VendorPatternRow) : null;
  }

  async upsertVendorPattern(pattern: Omit<VendorPattern, "id">): Promise<VendorPattern> {
    const { data, error } = await this.client
      .from("vendor_patterns")
      .upsert(
        {
          org_id: pattern.orgId,
          vendor_name: pattern.vendorName,
          avg_amount: pattern.avgAmount,
          amount_stddev: pattern.amountStddev,
          typical_interval_days: pattern.typicalIntervalDays,
          sample_size: pattern.sampleSize,
          last_updated: pattern.lastUpdated,
        },
        { onConflict: "org_id,vendor_name" }
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toVendorPattern(data as VendorPatternRow);
  }

  async insertNotification(
    notification: Omit<Notification, "id" | "createdAt" | "readAt">
  ): Promise<Notification> {
    const { data, error } = await this.client
      .from("recon_notifications")
      .insert({
        org_id: notification.orgId,
        kind: notification.kind,
        transaction_id: notification.transactionId,
        message: notification.message,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toNotification(data as NotificationRow);
  }

  async listNotifications(orgId: string, limit = 50): Promise<Notification[]> {
    const { data, error } = await this.client
      .from("recon_notifications")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data as NotificationRow[]).map(toNotification);
  }
}

export function createSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function num(value: string | number | null | undefined, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  return typeof value === "number" ? value : Number(value);
}

function vector(value: number[] | string | null | undefined): number[] | null {
  if (!value) return null;
  return typeof value === "string" ? (JSON.parse(value) as number[]) : value;
}

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    orgId: row.org_id,
    accountId: row.account_id,
    amount: num(row.amount),
    currency: row.currency as Currency,
    txnDate: row.txn_date,
    payeeRaw: row.payee_raw,
    memo: row.memo,
    embedding: vector(row.embedding),
    modelVersion: row.model_version,
    status: row.status as TransactionStatus,
    createdAt: row.created_at,
  };
}

function toLedgerEntry(row: LedgerRow): LedgerEntry {
  return {
    id: row.id,
    orgId: row.org_id,
    entryType: row.entry_type as LedgerEntryType,
    amount: num(row.amount),
    currency: row.currency as Currency,
    vendorName: row.vendor_name,
    memo: row.memo,
    entryDate: row.entry_date,
    embedding: vector(row.embedding),
    modelVersion: row.model_version,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function toMatch(row: MatchRow): Match {
  return {
    id: row.id,
    orgId: row.org_id,
    transactionId: row.transaction_id,
    ledgerEntryId: row.ledger_entry_id,
    confidenceScore: row.confidence_score === null ? null : num(row.confidence_score),
    matchMethod: row.match_method as MatchMethod,
    matchedBy: row.matched_by,
    rationale: row.rationale,
    createdAt: row.created_at,
  };
}

function toVendorPattern(row: VendorPatternRow): VendorPattern {
  return {
    id: row.id,
    orgId: row.org_id,
    vendorName: row.vendor_name,
    avgAmount: num(row.avg_amount),
    amountStddev: num(row.amount_stddev),
    typicalIntervalDays: num(row.typical_interval_days),
    sampleSize: row.sample_size,
    lastUpdated: row.last_updated,
  };
}

function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    orgId: row.org_id,
    kind: row.kind as Notification["kind"],
    transactionId: row.transaction_id,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

function configFromRow(row: ConfigRow): Partial<ReconConfig> {
  return {
    autoMatchThreshold: row.auto_match_threshold ?? undefined,
    ambiguousBandFloor: row.ambiguous_band_floor ?? undefined,
    topK: row.top_k ?? undefined,
    tieEpsilon: row.tie_epsilon ?? undefined,
    amountTolerancePct: row.amount_tolerance_pct ?? undefined,
    amountToleranceFlat: row.amount_tolerance_flat ?? undefined,
    dateWindowDays: row.date_window_days ?? undefined,
    anomalyZScoreThreshold: row.anomaly_z_score_threshold ?? undefined,
    anomalyIntervalFactor: row.anomaly_interval_factor ?? undefined,
    ruleMatchConfidence: row.rule_match_confidence ?? undefined,
  };
}

function configToRow(config: Partial<ReconConfig>): Record<string, number> {
  const row: Record<string, number> = {};
  const mapping: [keyof ReconConfig, string][] = [
    ["autoMatchThreshold", "auto_match_threshold"],
    ["ambiguousBandFloor", "ambiguous_band_floor"],
    ["topK", "top_k"],
    ["tieEpsilon", "tie_epsilon"],
    ["amountTolerancePct", "amount_tolerance_pct"],
    ["amountToleranceFlat", "amount_tolerance_flat"],
    ["dateWindowDays", "date_window_days"],
    ["anomalyZScoreThreshold", "anomaly_z_score_threshold"],
    ["anomalyIntervalFactor", "anomaly_interval_factor"],
    ["ruleMatchConfidence", "rule_match_confidence"],
  ];
  for (const [key, column] of mapping) {
    const value = config[key];
    if (typeof value === "number") row[column] = value;
  }
  return row;
}
