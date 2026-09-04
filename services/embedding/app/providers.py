"""Embedding providers.

The model version is returned with every batch and persisted on the vector row,
so a model upgrade becomes a traceable, resumable re-embedding job.
"""

from __future__ import annotations

import math
import os
from functools import lru_cache
from typing import List, Protocol

DIMENSIONS = 1536


class EmbeddingProvider(Protocol):
    model_version: str
    dimensions: int

    def embed(self, texts: List[str]) -> List[List[float]]:
        ...


class OpenAIEmbeddingProvider:
    """Calls the OpenAI embeddings API. Used when OPENAI_API_KEY is present."""

    def __init__(self, model: str = "text-embedding-3-small") -> None:
        from openai import OpenAI

        self._client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
        self._model = model
        self.model_version = f"openai:{model}"
        self.dimensions = DIMENSIONS

    def embed(self, texts: List[str]) -> List[List[float]]:
        response = self._client.embeddings.create(model=self._model, input=texts)
        return [item.embedding for item in response.data]


class HashEmbeddingProvider:
    """Deterministic character-trigram hashing.

    Not semantic, but offline and reproducible — it mirrors the TypeScript
    fallback in lib/recon/embeddings.ts so local runs behave identically.
    """

    def __init__(self, dimensions: int = DIMENSIONS) -> None:
        self.model_version = "local-hash-v1"
        self.dimensions = dimensions

    def embed(self, texts: List[str]) -> List[List[float]]:
        return [self._embed_one(text) for text in texts]

    def _embed_one(self, text: str) -> List[float]:
        vector = [0.0] * self.dimensions
        padded = f" {text.strip()} "
        for i in range(len(padded) - 2):
            vector[_hash_to_index(padded[i : i + 3], self.dimensions)] += 1.0
        norm = math.sqrt(sum(v * v for v in vector))
        if norm == 0:
            return vector
        return [v / norm for v in vector]


def _hash_to_index(value: str, buckets: int) -> int:
    h = 0x811C9DC5
    for char in value:
        h = ((h ^ ord(char)) * 0x01000193) & 0xFFFFFFFF
    return h % buckets


@lru_cache(maxsize=1)
def resolve_provider() -> EmbeddingProvider:
    if os.getenv("OPENAI_API_KEY"):
        return OpenAIEmbeddingProvider(
            os.getenv("RECON_EMBEDDING_MODEL", "text-embedding-3-small")
        )
    return HashEmbeddingProvider()
