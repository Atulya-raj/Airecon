import { createClient } from "@supabase/supabase-js";

export interface Session {
  userId: string;
  orgId: string;
}

/**
 * Resolves the caller's org from the bearer token — never from the request
 * body, so a client cannot address another tenant's data. In local
 * development (no Supabase configured) RECON_DEV_ORG_ID stands in.
 */
export async function resolveSession(request: Request): Promise<Session | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    const devOrgId = process.env.RECON_DEV_ORG_ID;
    return devOrgId ? { userId: "dev-user", orgId: devOrgId } : null;
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const client = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;

  const { data: membership } = await client
    .from("org_members")
    .select("org_id")
    .eq("user_id", data.user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) return null;

  return { userId: data.user.id, orgId: (membership as { org_id: string }).org_id };
}

export function unauthorized(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
