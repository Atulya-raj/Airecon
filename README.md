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
   ≥ 0.92    → auto match (method: embedding)
   otherwise → deterministic rules → match (method: rule)
               or anomaly signals  → review queue
   human confirms → match (method: manual)
```

Rules run for everything the embedding score did not auto-match, not only the
0.75–0.92 band: below the floor the score carries no information, but amount,
date and vendor agreement still do. Below-band candidates must additionally
agree on the party, so arithmetic coincidence alone can never resolve a match.

The rules, in `lib/recon/rule-engine.ts`:

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

Copy `.env.example` to `.env.local` to point at real infrastructure. API routes
authenticate from the session, so set `RECON_DEV_ORG_ID=demo-org` when calling
them with curl. The local store persists to `.local-recon-db.json` — delete it
for a clean seed.

The local hash embedder is deterministic, not semantic: it scores well below the
auto-match threshold, so locally the deterministic rules do the matching and a
purely semantic case (`AMZN MKTP US*2K3F9` → `Amazon`) stays in the review queue.
That path needs a real model — set `OPENAI_API_KEY` and run the embedding service.

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

### Forecasting & Baselines

A time-series cash-flow forecasting engine lives in `lib/recon/forecast.ts` and
is exposed via `GET /api/forecast`. It projects daily net flows, cumulative cash
trajectories, and 95% confidence intervals over 30-, 60-, and 90-day horizons.
Per-tenant matching thresholds can be inspected and updated via `GET /api/config`
and `PATCH /api/config`.

## Not yet built

Accounting-system two-way sync (QuickBooks / Xero), Stripe subscription billing,
Inngest/QStash background job runner, and production Plaid/Teller credential
exchange. Ingestion adapters normalize both providers' payload shapes today,
but amount-sign semantics should be confirmed against live provider data before
production use.
