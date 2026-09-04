export interface RateLimitResult {
  success: boolean;
  remaining: number;
}

/**
 * Per-org and per-IP token bucket at the edge. Allows all requests when
 * Upstash is not configured (local development).
 */
export async function checkRateLimit(
  identifier: string,
  limit = 60,
  window: `${number} ${"s" | "m" | "h"}` = "1 m"
): Promise<RateLimitResult> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return { success: true, remaining: limit };
  }

  try {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");

    const ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(limit, window),
      prefix: "reconai",
    });

    const result = await ratelimit.limit(identifier);
    return { success: result.success, remaining: result.remaining };
  } catch (error) {
    console.error("Rate limit check failed, allowing request:", error);
    return { success: true, remaining: limit };
  }
}

export function tooManyRequests(): Response {
  return Response.json(
    { error: "Too many requests. Please try again later." },
    { status: 429 }
  );
}
