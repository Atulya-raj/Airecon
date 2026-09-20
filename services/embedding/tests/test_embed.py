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


def test_forecast_returns_projection() -> None:
    flows = [
        {"date": "2026-08-01", "net": 500.0},
        {"date": "2026-08-02", "net": -200.0},
        {"date": "2026-08-03", "net": 800.0},
    ]
    response = client.post("/forecast", json={"flows": flows, "horizon_days": 14})
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert len(body["projected"]) == 14
    first_proj = body["projected"][0]
    assert "projected_net" in first_proj
    assert first_proj["upper_bound"] >= first_proj["lower_bound"]
