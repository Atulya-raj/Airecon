import { resolveSession, unauthorized, type Session } from "./auth";
import { checkRateLimit, tooManyRequests } from "./rate-limit";

/**
 * Every route runs through this: authenticate, derive org_id from the session,
 * rate limit per org, and never trust an org id from the payload.
 */
export async function withOrg(
  request: Request,
  handler: (session: Session) => Promise<Response>,
  options: { limit?: number } = {}
): Promise<Response> {
  const session = await resolveSession(request);
  if (!session) return unauthorized();

  const rate = await checkRateLimit(`org:${session.orgId}`, options.limit ?? 60);
  if (!rate.success) return tooManyRequests();

  try {
    return await handler(session);
  } catch (error) {
    console.error("API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const isNotFound = message.endsWith("not found");
    return Response.json(
      { error: isNotFound ? message : "Internal server error" },
      { status: isNotFound ? 404 : 500 }
    );
  }
}

export function badRequest(details: unknown): Response {
  return Response.json({ error: "Invalid input", details }, { status: 400 });
}
