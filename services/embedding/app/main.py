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


class FlowPoint(BaseModel):
    date: str
    net: float


class ForecastRequest(BaseModel):
    flows: List[FlowPoint]
    horizon_days: int = Field(default=30, ge=7, le=365)


class ProjectedPoint(BaseModel):
    date: str
    projected_net: float
    lower_bound: float
    upper_bound: float


class ForecastServiceResponse(BaseModel):
    status: str
    projected: List[ProjectedPoint]


@app.post("/forecast", response_model=ForecastServiceResponse)
def forecast(
    request: ForecastRequest,
    _: None = Depends(require_api_key),
) -> ForecastServiceResponse:
    """Computes time series projection with simple linear trend and confidence bounds."""
    if not request.flows:
        return ForecastServiceResponse(status="empty", projected=[])

    n = len(request.flows)
    nets = [p.net for p in request.flows]
    sum_x = sum(range(n))
    sum_y = sum(nets)
    sum_xy = sum(i * nets[i] for i in range(n))
    sum_xx = sum(i * i for i in range(n))

    slope = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x) if n > 1 else 0.0
    intercept = (sum_y - slope * sum_x) / n if n > 0 else 0.0

    residuals = [nets[i] - (intercept + slope * i) for i in range(n)]
    res_var = sum(r * r for r in residuals) / max(1, n - 2) if n > 2 else 2500.0
    std_err = res_var ** 0.5

    projected: List[ProjectedPoint] = []
    for h in range(1, request.horizon_days + 1):
        est = intercept + slope * (n + h - 1)
        margin = 1.96 * std_err * ((1 + 1 / max(1, n) + (h * h) / max(1, sum_xx)) ** 0.5)
        projected.append(
            ProjectedPoint(
                date=f"T+{h}d",
                projected_net=round(est, 2),
                lower_bound=round(est - margin, 2),
                upper_bound=round(est + margin, 2),
            )
        )

    return ForecastServiceResponse(status="ok", projected=projected)
