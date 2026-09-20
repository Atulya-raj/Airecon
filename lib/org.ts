import { getServerSession, TEST_USER } from "./auth-session";

/**
 * Org used by the server-rendered review UI. In production this comes from the
 * authenticated session cookie; locally it defaults to the test user org "org-atulya".
 */
export const DEMO_ORG_ID = TEST_USER.orgId;

export async function getSessionOrgId(): Promise<string> {
  try {
    const session = await getServerSession();
    if (session?.orgId) {
      return session.orgId;
    }
  } catch {
    // outside request context or static build
  }
  return process.env.RECON_DEV_ORG_ID ?? DEMO_ORG_ID;
}

export function getUiOrgId(): string {
  return process.env.RECON_DEV_ORG_ID ?? DEMO_ORG_ID;
}

