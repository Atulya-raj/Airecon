from fastapi.testclient import TestClient

from app.main import app
from app.providers import HashEmbeddingProvider

client = TestClient(app)


def test_health_reports_model_version() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["dimensions"] == 1536


def test_embed_returns_one_vector_per_text() -> None:
    response = client.post("/embed", json={"texts": ["2450.00 2026-08-01 northwind", "x"]})
    assert response.status_code == 200
    body = response.json()
    assert len(body["embeddings"]) == 2
    assert len(body["embeddings"][0]) == body["dimensions"]


def test_hash_provider_is_deterministic_and_normalized() -> None:
    provider = HashEmbeddingProvider()
    first, second = provider.embed(["northwind traders wire", "northwind traders wire"])
    assert first == second
    assert abs(sum(v * v for v in first) - 1.0) < 1e-9
