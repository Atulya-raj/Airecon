---
name: testing-recon-dashboard
description: How to run and end-to-end test the ReconAI dashboard (Next.js app + optional FastAPI embedding service) locally, including the local JSON store, org auth for API routes, and what the demo book is expected to produce.
---

# Testing the ReconAI recon dashboard

## Running locally (no credentials required)
- `npm install` then `npm run dev` (http://localhost:3000). With no
  `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`, the app uses a JSON-backed
  store at `./.local-recon-db.json` and a deterministic local hash embedder.
- The local store **persists to disk**: `rm .local-recon-db.json` before a clean run,
  otherwise "Load demo book" is a no-op (it only seeds when there are 0 transactions).
- API routes (`/api/transactions`, `/api/anomalies`, `POST /api/reconcile/run`, `/api/ledger`)
  return 401 unless a session resolves. Without Supabase configured, the only way to get a
  session is the env var `RECON_DEV_ORG_ID`. Start the dev server with
  `RECON_DEV_ORG_ID=demo-org npm run dev` — `demo-org` matches the UI's default org
  (`lib/org.ts`), so UI and API see the same data. Then plain `curl localhost:3000/api/...`
  works with no auth header.
- The FastAPI service in `services/embedding` is optional. Without `OPENAI_API_KEY` it uses
  the *same* hash embedder as the TS fallback, so starting it does not change matching
  results. Only an `OPENAI_API_KEY` (OpenAI `text-embedding-3-small`) exercises real
  semantic embeddings.

## UI paths
- Dashboard `/`: header buttons "Load demo book" and "Run reconciliation" (server actions in
  `app/actions.ts`). Review queue cards each have per-candidate "Match" buttons and a
  "No match — mark reviewed" link. Counts are Transactions / Auto-matched / Reviewed /
  Needs review / Unmatched.
- The demo book seeds 9 transactions (3 pre-reviewed Cloudspend history + 6 new) and 6 open
  ledger entries.
- Re-running reconciliation only picks up transactions with status `unmatched`
  (`selectTransactions` in `lib/recon/pipeline.ts`), so a second run is a no-op
  (`processed: 0`) and does not retry anomalies.

## Known matching pitfall (verify before claiming spec compliance)
With the default local hash embedder, cosine similarities between transactions and ledger
entries land around 0.2–0.7 — below the `ambiguousBandFloor` of 0.75. Since the rule engine
(amount tolerance, date window, running balance) is only evaluated for candidates *inside*
the ambiguous band, those rules may never fire locally and most transactions end up in the
anomaly queue instead of auto-matched. If a task expects "clean invoice auto-matched via
embeddings" / "fee-adjusted wire matched by tolerance" / "batched deposit matched by running
balance", check the per-card score text ("Best candidate scored 0.xxx, below the ambiguous
band floor 0.75") before reporting pass. Workarounds to distinguish product bug from
embedder limitation: supply `OPENAI_API_KEY` to the embedding service, or exercise the
pipeline with `configOverrides` (lower `ambiguousBandFloor`) via `runReconciliation`.

## Devin Secrets Needed
- None for the default local run.
- `OPENAI_API_KEY` — only if you need real semantic embeddings from
  `services/embedding` to validate embedding-based auto-matching.
