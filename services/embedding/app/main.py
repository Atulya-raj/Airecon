"""ReconAI embedding service.

Isolated from the Next.js app so embedding work scales and redeploys
independently, and so a slow model call never blocks a web request.
"""

from __future__ import annotations

import os
from typing import List

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from .providers import EmbeddingProvider, resolve_provider

app = FastAPI(title="ReconAI Embedding Service", version="0.1.0")


class EmbedRequest(BaseModel):
    texts: List[str] = Field(..., min_length=1, max_length=256)


class EmbedResponse(BaseModel):
    embeddings: List[List[float]]
    model_version: str
    dimensions: int


def require_api_key(authorization: str | None = Header(default=None)) -> None:
    expected = os.getenv("RECON_EMBEDDING_SERVICE_KEY")
    if not expected:
        return
    if authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="Unauthorized")


def get_provider() -> EmbeddingProvider:
    return resolve_provider()


@app.get("/health")
def health(provider: EmbeddingProvider = Depends(get_provider)) -> dict[str, object]:
    return {
        "status": "ok",
        "model_version": provider.model_version,
        "dimensions": provider.dimensions,
    }


@app.post("/embed", response_model=EmbedResponse)
def embed(
    request: EmbedRequest,
    provider: EmbeddingProvider = Depends(get_provider),
    _: None = Depends(require_api_key),
) -> EmbedResponse:
    vectors = provider.embed(request.texts)
    return EmbedResponse(
        embeddings=vectors,
        model_version=provider.model_version,
        dimensions=provider.dimensions,
    )
