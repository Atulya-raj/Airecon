# ReconAI Embedding Service

FastAPI service that turns serialized transactions and ledger entries into
vectors. Deployed separately from the web app so embedding throughput scales
independently.

## Run locally

```bash
cd services/embedding
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Point the web app at it with `RECON_EMBEDDING_SERVICE_URL=http://localhost:8000`.

## Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Liveness plus the active model version and dimensions |
| `/embed` | POST | `{ "texts": [...] }` → `{ "embeddings": [...], "model_version": "..." }` |

## Providers

- `OPENAI_API_KEY` set → OpenAI `text-embedding-3-small` (override with `RECON_EMBEDDING_MODEL`).
- Otherwise → deterministic local hash embedder, identical to the TypeScript
  fallback in `lib/recon/embeddings.ts`.

Set `RECON_EMBEDDING_SERVICE_KEY` to require a bearer token.

## Tests

```bash
pytest
```
