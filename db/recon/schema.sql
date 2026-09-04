-- ReconAI core schema (Supabase / Postgres + pgvector).
-- Apply with: psql "$DATABASE_URL" -f db/recon/schema.sql

create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan_tier text not null default 'starter',
  created_at timestamptz not null default now()
);

-- Membership drives row-level security: a user only sees rows for orgs they belong to.
create table if not exists org_members (
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member', -- owner | admin | member | viewer
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  account_id uuid not null,
  external_id text,                 -- aggregator id, used for idempotent ingestion
  amount numeric(14,2) not null,
  currency text not null default 'USD',
  txn_date date not null,
  payee_raw text,
  memo text,
  embedding vector(1536),
  model_version text,               -- embedding model that produced `embedding`
  source_hash text,                 -- hash of the serialized text; skip re-embedding when unchanged
  status text not null default 'unmatched'
    check (status in ('unmatched', 'auto_matched', 'reviewed', 'anomalous')),
  created_at timestamptz not null default now(),
  unique (org_id, external_id)
);

create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  entry_type text not null check (entry_type in ('invoice', 'expense', 'refund')),
  amount numeric(14,2) not null,
  currency text not null default 'USD',
  vendor_name text,
  memo text,
  entry_date date not null,
  embedding vector(1536),
  model_version text,
  source_hash text,
  created_at timestamptz not null default now()
);

-- Append-only audit trail: every reconciliation decision is a permanent record.
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  transaction_id uuid not null references transactions(id) on delete cascade,
  ledger_entry_id uuid references ledger_entries(id),
  confidence_score numeric(5,4),
  match_method text not null check (match_method in ('embedding', 'rule', 'manual')),
  matched_by text not null default 'system',
  rationale text,
  created_at timestamptz not null default now()
);

create table if not exists vendor_patterns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  vendor_name text not null,
  avg_amount numeric(14,2),
  amount_stddev numeric(14,2),
  typical_interval_days numeric(6,2),
  sample_size integer not null default 0,
  last_updated timestamptz not null default now(),
  unique (org_id, vendor_name)
);

-- Thresholds live in config, not in code, so they can be tuned per tenant.
create table if not exists recon_org_config (
  org_id uuid primary key references organizations(id) on delete cascade,
  auto_match_threshold numeric(5,4),
  ambiguous_band_floor numeric(5,4),
  top_k integer,
  tie_epsilon numeric(5,4),
  amount_tolerance_pct numeric(5,4),
  amount_tolerance_flat numeric(14,2),
  date_window_days integer,
  anomaly_z_score_threshold numeric(5,2),
  anomaly_interval_factor numeric(5,2),
  rule_match_confidence numeric(5,4),
  updated_at timestamptz not null default now()
);

create table if not exists recon_notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  kind text not null, -- anomaly | low_confidence | forecast_update
  transaction_id uuid references transactions(id) on delete cascade,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists transactions_org_status_idx on transactions (org_id, status, txn_date desc);
create index if not exists ledger_entries_org_date_idx on ledger_entries (org_id, entry_date desc);
create index if not exists matches_org_txn_idx on matches (org_id, transaction_id, created_at desc);
create index if not exists transactions_embedding_idx on transactions using ivfflat (embedding vector_cosine_ops);
create index if not exists ledger_entries_embedding_idx on ledger_entries using ivfflat (embedding vector_cosine_ops);

-- Top-K candidate retrieval over the ivfflat index. Org scoping is inside the
-- function so callers cannot omit it.
create or replace function match_ledger_entries(
  p_org_id uuid,
  p_embedding vector(1536),
  p_top_k integer default 5
)
returns table (
  id uuid,
  org_id uuid,
  entry_type text,
  amount numeric,
  currency text,
  vendor_name text,
  memo text,
  entry_date date,
  model_version text,
  score double precision
)
language sql stable as $$
  select l.id, l.org_id, l.entry_type, l.amount, l.currency, l.vendor_name,
         l.memo, l.entry_date, l.model_version,
         1 - (l.embedding <=> p_embedding) as score
  from ledger_entries l
  where l.org_id = p_org_id
    and l.embedding is not null
    and not exists (
      select 1 from matches m
      where m.ledger_entry_id = l.id and m.org_id = p_org_id
    )
  order by l.embedding <=> p_embedding
  limit p_top_k;
$$;

-- Immutability of the audit trail is enforced in the database, not only in app code.
create or replace function recon_reject_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'matches is append-only';
end;
$$;

drop trigger if exists matches_append_only on matches;
create trigger matches_append_only
  before update or delete on matches
  for each row execute function recon_reject_mutation();

-- Row-Level Security: cross-tenant isolation enforced at the database layer,
-- so a missing `where org_id = ...` in application code cannot leak data.
alter table organizations enable row level security;
alter table org_members enable row level security;
alter table transactions enable row level security;
alter table ledger_entries enable row level security;
alter table matches enable row level security;
alter table vendor_patterns enable row level security;
alter table recon_org_config enable row level security;
alter table recon_notifications enable row level security;

create or replace function is_org_member(target_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from org_members m
    where m.org_id = target_org and m.user_id = auth.uid()
  );
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'transactions', 'ledger_entries', 'matches',
    'vendor_patterns', 'recon_org_config', 'recon_notifications'
  ] loop
    execute format('drop policy if exists %I_org_isolation on %I', t, t);
    execute format(
      'create policy %I_org_isolation on %I for all
         using (is_org_member(org_id)) with check (is_org_member(org_id))',
      t, t
    );
  end loop;
end;
$$;

drop policy if exists organizations_member_read on organizations;
create policy organizations_member_read on organizations
  for select using (is_org_member(id));

drop policy if exists org_members_self_read on org_members;
create policy org_members_self_read on org_members
  for select using (user_id = auth.uid());
