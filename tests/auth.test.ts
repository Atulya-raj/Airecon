import { describe, expect, it } from "vitest";
import { authenticateUser, TEST_USER } from "../lib/auth-session";

describe("Authentication & Session Logic", () => {
  it("authenticates the hardcoded test user (atulya) successfully", () => {
    const result = authenticateUser("atulya", "atulya@2222");
    expect(result.success).toBe(true);
    expect(result.session).toBeDefined();
    expect(result.session?.username).toBe("atulya");
    expect(result.session?.orgId).toBe("org-atulya");
    expect(result.session?.isTestUser).toBe(true);
  });

  it("handles case-insensitivity on test username", () => {
    const result = authenticateUser("Atulya", "atulya@2222");
    expect(result.success).toBe(true);
    expect(result.session?.username).toBe("atulya");
  });

  it("rejects incorrect password for test user", () => {
    const result = authenticateUser("atulya", "wrongpass");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Incorrect password");
    expect(result.session).toBeUndefined();
  });

  it("authenticates dynamic non-hardcoded business user with isolated blank orgId", () => {
    const result = authenticateUser("acmecorp", "mypassword123");
    expect(result.success).toBe(true);
    expect(result.session).toBeDefined();
    expect(result.session?.username).toBe("acmecorp");
    expect(result.session?.orgId).toBe("org-acmecorp");
    expect(result.session?.isTestUser).toBe(false);
  });

  it("rejects blank credentials", () => {
    const emptyUser = authenticateUser("", "somepass");
    expect(emptyUser.success).toBe(false);

    const emptyPass = authenticateUser("user123", "");
    expect(emptyPass.success).toBe(false);
  });

  it("rejects password shorter than 4 characters for dynamic accounts", () => {
    const result = authenticateUser("newuser", "12");
    expect(result.success).toBe(false);
    expect(result.error).toContain("at least 4 characters");
  });
});
