import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface UserSession {
  username: string;
  name: string;
  orgId: string;
  role: string;
  isTestUser: boolean;
  loggedInAt: string;
}

export const TEST_USER = {
  username: "atulya",
  password: "atulya@2222",
  name: "Atulya Raj",
  orgId: "org-atulya",
  role: "Business Owner / Administrator",
};

const SESSION_COOKIE_NAME = "reconai_session";

/**
 * Encodes session data to a base64 JSON string for cookie storage.
 */
function serializeSession(session: UserSession): string {
  return Buffer.from(JSON.stringify(session)).toString("base64");
}

/**
 * Decodes session data from base64 JSON string.
 */
function deserializeSession(data: string): UserSession | null {
  try {
    const json = Buffer.from(data, "base64").toString("utf-8");
    return JSON.parse(json) as UserSession;
  } catch {
    return null;
  }
}

/**
 * Retrieves the current session from incoming request cookies in Server Components.
 */
export async function getServerSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  return deserializeSession(raw);
}

/**
 * Sets session cookie on successful login.
 */
export async function setServerSession(session: UserSession): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: serializeSession(session),
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/**
 * Clears session cookie on logout.
 */
export async function clearServerSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Validates credentials and returns UserSession or error.
 */
export function authenticateUser(usernameInput: string, passwordInput: string): { success: boolean; session?: UserSession; error?: string } {
  const cleanUsername = usernameInput.trim().toLowerCase();
  const cleanPassword = passwordInput.trim();

  if (!cleanUsername) {
    return { success: false, error: "Username is required." };
  }
  if (!cleanPassword) {
    return { success: false, error: "Password is required." };
  }

  // 1. Check test user
  if (cleanUsername === TEST_USER.username.toLowerCase()) {
    if (cleanPassword === TEST_USER.password) {
      return {
        success: true,
        session: {
          username: TEST_USER.username,
          name: TEST_USER.name,
          orgId: TEST_USER.orgId,
          role: TEST_USER.role,
          isTestUser: true,
          loggedInAt: new Date().toISOString(),
        },
      };
    } else {
      return { success: false, error: "Incorrect password for user 'atulya'." };
    }
  }

  // 2. Generic custom business user (non-hardcoded dynamic account)
  // Allows testing with any username/password without hardcoded constraints
  if (cleanPassword.length < 4) {
    return { success: false, error: "Password must be at least 4 characters." };
  }

  const sanitizedOrgName = cleanUsername.replace(/[^a-z0-9]/g, "-").slice(0, 24) || "mybiz";

  return {
    success: true,
    session: {
      username: cleanUsername,
      name: cleanUsername.charAt(0).toUpperCase() + cleanUsername.slice(1),
      orgId: `org-${sanitizedOrgName}`,
      role: "Business Workspace",
      isTestUser: false,
      loggedInAt: new Date().toISOString(),
    },
  };
}

/**
 * Ensures user is authenticated before rendering server pages; otherwise redirects to /login.
 */
export async function requireAuthSession(): Promise<UserSession> {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

