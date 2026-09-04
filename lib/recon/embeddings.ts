import { sourceHash } from "./serialize";

export const EMBEDDING_DIMENSIONS = 1536;
export const LOCAL_MODEL_VERSION = "local-hash-v1";

export interface EmbeddingResult {
  vector: number[];
  modelVersion: string;
}

export interface EmbeddingClient {
  embed(texts: string[]): Promise<EmbeddingResult[]>;
}

/**
 * Calls the FastAPI embedding service (services/embedding). Falls back to a
 * deterministic local embedder when the service is not configured or is
 * unreachable, so the pipeline stays runnable in dev and in tests.
 */
export class HttpEmbeddingClient implements EmbeddingClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey?: string,
    private readonly timeoutMs = 10_000
  ) {}

  async embed(texts: string[]): Promise<EmbeddingResult[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/embed`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({ texts }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Embedding service returned ${response.status}`);
      }
      const body = (await response.json()) as {
        embeddings: number[][];
        model_version: string;
      };
      if (body.embeddings.length !== texts.length) {
        throw new Error("Embedding service returned mismatched batch size");
      }
      return body.embeddings.map((vector) => ({
        vector,
        modelVersion: body.model_version,
      }));
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Deterministic bag-of-features embedder: hashes character trigrams into a
 * fixed-width vector. Not semantic, but stable and offline — it keeps the
 * pipeline, the review UI, and the tests working without an external model.
 */
export class LocalEmbeddingClient implements EmbeddingClient {
  constructor(private readonly dimensions = EMBEDDING_DIMENSIONS) {}

  async embed(texts: string[]): Promise<EmbeddingResult[]> {
    return texts.map((text) => ({
      vector: this.embedOne(text),
      modelVersion: LOCAL_MODEL_VERSION,
    }));
  }

  private embedOne(text: string): number[] {
    const vector = new Array<number>(this.dimensions).fill(0);
    const padded = ` ${text.trim()} `;
    for (let i = 0; i < padded.length - 2; i++) {
      const gram = padded.slice(i, i + 3);
      const bucket = hashToIndex(gram, this.dimensions);
      vector[bucket] += 1;
    }
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return norm === 0 ? vector : vector.map((v) => v / norm);
  }
}

/**
 * Wraps a client with content-hash deduplication: a text already embedded in
 * this process is never sent to the model again.
 */
export class CachingEmbeddingClient implements EmbeddingClient {
  private readonly cache = new Map<string, EmbeddingResult>();

  constructor(
    private readonly inner: EmbeddingClient,
    private readonly maxEntries = 5_000
  ) {}

  async embed(texts: string[]): Promise<EmbeddingResult[]> {
    const missing: string[] = [];
    for (const text of texts) {
      const key = sourceHash(text);
      if (!this.cache.has(key) && !missing.includes(text)) missing.push(text);
    }
    if (missing.length > 0) {
      const fresh = await this.inner.embed(missing);
      missing.forEach((text, i) => this.set(sourceHash(text), fresh[i]));
    }
    return texts.map((text) => {
      const hit = this.cache.get(sourceHash(text));
      if (!hit) throw new Error("Embedding cache miss after fill");
      return hit;
    });
  }

  private set(key: string, value: EmbeddingResult): void {
    if (this.cache.size >= this.maxEntries) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, value);
  }
}

/** Uses the remote service when reachable, otherwise the local embedder. */
export class ResilientEmbeddingClient implements EmbeddingClient {
  constructor(
    private readonly primary: EmbeddingClient,
    private readonly fallback: EmbeddingClient = new LocalEmbeddingClient()
  ) {}

  async embed(texts: string[]): Promise<EmbeddingResult[]> {
    try {
      return await this.primary.embed(texts);
    } catch (error) {
      console.error("Embedding service unavailable, using local embedder:", error);
      return this.fallback.embed(texts);
    }
  }
}

let defaultClient: EmbeddingClient | null = null;

export function getEmbeddingClient(): EmbeddingClient {
  if (defaultClient) return defaultClient;
  const baseUrl = process.env.RECON_EMBEDDING_SERVICE_URL;
  const inner: EmbeddingClient = baseUrl
    ? new ResilientEmbeddingClient(
        new HttpEmbeddingClient(baseUrl, process.env.RECON_EMBEDDING_SERVICE_KEY)
      )
    : new LocalEmbeddingClient();
  defaultClient = new CachingEmbeddingClient(inner);
  return defaultClient;
}

export function setEmbeddingClient(client: EmbeddingClient | null): void {
  defaultClient = client;
}

function hashToIndex(value: string, buckets: number): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash = Math.imul(hash ^ value.charCodeAt(i), 0x01000193) >>> 0;
  }
  return hash % buckets;
}
