# ReconAI

AI-powered bank reconciliation for SMB bookkeeping: bank transactions in, matched
ledger entries and a reviewable anomaly queue out.

Matching is hybrid on purpose. Embeddings retrieve plausible ledger candidates
despite messy aggregator descriptors; deterministic rules decide the ambiguous
middle, because fee differences, date shifts and split payments are arithmetic,
not semantics. Nothing is force-matched — anything the rules cannot resolve is
queued for a human.

## Pipeline

```
normalize → serialize → embed → top-K candidates
   ≥ 0.92            → auto match (method: embedding)
   0.75 – 0.92       → deterministic rules → match (method: rule) or queue
   < 0.75            → anomaly signals → review queue
   human confirms    → match (method: manual)
```

Rules applied in the ambiguous band, in `lib/recon/rule-engine.ts`:

| Rule | Handles |
| --- | --- |
| `amount_tolerance` | wire/processor fees, FX rounding |
| `date_window` | settlement lag between ledger date and bank date |
| `running_balance` | batched deposits and split payments (bounded subset sum) |
| `recurring_vendor` | confidence boost when amount and cadence fit the vendor baseline |

Matches are append-only in both the application layer and the schema (an
`UPDATE`/`DELETE` trigger on `matches`), so a correction is a new row and the
audit trail survives.

## Running locally

```bash
npm install
npm run dev
```

No configuration is required: without Supabase credentials the app uses a
JSON-backed local store, and without an embedding service URL it uses a
deterministic local embedder (`local-hash-v1`). Open the dashboard, click
**Load demo book**, then **Run reconciliation** to exercise the clean,
fee-adjusted, batched, recurring, outlier and unknown-vendor paths.

Copy `.env.example` to `.env.local` to point at real infrastructure.

### Embedding service

An independently deployable FastAPI service lives in `services/embedding`. It
uses OpenAI `text-embedding-3-small` when `OPENAI_API_KEY` is set and the same
deterministic hash embedder otherwise, so dev and CI never need a model key.
See its README for run instructions.

### Database

`db/recon/schema.sql` creates the tables, pgvector indexes, the
`match_ledger_entries` RPC, the append-only trigger, and RLS policies. Tenant
isolation is enforced by RLS rather than application filters alone, so a missing
`where org_id = ...` cannot leak another org's book.

## Checks

```bash
npm run lint
npm run type-check
npm test
npm run build

cd services/embedding && pytest
```

## Not yet built

Forecasting, accounting-system sync, billing, and production Plaid/Teller
credentials. Ingestion adapters normalize both providers' payload shapes today,
but amount-sign semantics should be confirmed against live provider data before
production use.
