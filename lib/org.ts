/**
 * Org used by the server-rendered review UI. In production this comes from the
 * authenticated Supabase session (see lib/auth.ts); locally it falls back to a
 * single demo tenant so the UI is usable without auth configured.
 */
export const DEMO_ORG_ID = "demo-org";

export function getUiOrgId(): string {
  return process.env.RECON_DEV_ORG_ID ?? DEMO_ORG_ID;
}
