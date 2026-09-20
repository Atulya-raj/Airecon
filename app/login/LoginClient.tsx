"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/app/actions";

export default function LoginClient() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleFillTestAccount = () => {
    setUsername("atulya");
    setPassword("atulya@2222");
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError("Please enter your username.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("username", username.trim());
      formData.set("password", password);

      const res = await loginAction(formData);
      if (res.success) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(res.error || "Login failed. Please verify credentials.");
      }
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "radial-gradient(ellipse at top, var(--accent-subtle) 0%, var(--bg) 70%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "var(--card-bg)",
          borderRadius: "16px",
          border: "1px solid var(--border)",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.3)",
          overflow: "hidden",
        }}
      >
        {/* Top Header Banner */}
        <div
          style={{
            padding: "32px 32px 24px",
            borderBottom: "1px solid var(--border)",
            textAlign: "center",
            background: "linear-gradient(180deg, rgba(16, 185, 129, 0.06) 0%, transparent 100%)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "var(--accent-glow)",
              color: "var(--accent)",
              fontWeight: 800,
              fontSize: "1.35rem",
              marginBottom: "16px",
              border: "1px solid var(--accent)",
            }}
          >
            ⚡
          </div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              margin: 0,
              color: "var(--fg)",
            }}
          >
            AI-Recon Workspace
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--fg-muted)",
              marginTop: "8px",
              lineHeight: 1.45,
            }}
          >
            Autonomous financial reconciliation & live bank tracking for Indian & global enterprises
          </p>
        </div>

        {/* Form Body */}
        <div style={{ padding: "28px 32px 32px" }}>
          {/* 1-Click Quick Fill Button */}
          <div
            style={{
              background: "var(--bg-subtle)",
              border: "1px dashed var(--accent)",
              borderRadius: "10px",
              padding: "12px 14px",
              marginBottom: "22px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div style={{ fontSize: "0.8rem", color: "var(--fg-muted)" }}>
              <strong style={{ color: "var(--fg)" }}>Test Account:</strong> atulya
              <div style={{ fontSize: "0.72rem", opacity: 0.8 }}>Preloaded with realistic demo dataset</div>
            </div>
            <button
              type="button"
              onClick={handleFillTestAccount}
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--accent)",
                background: "var(--accent-glow)",
                border: "1px solid var(--accent)",
                borderRadius: "6px",
                padding: "6px 10px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              Fill Credentials ⚡
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "var(--danger)",
                fontSize: "0.85rem",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Username Input */}
            <div>
              <label
                htmlFor="username"
                style={{
                  display: "block",
                  fontSize: "0.825rem",
                  fontWeight: 600,
                  color: "var(--fg-muted)",
                  marginBottom: "6px",
                }}
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. atulya or your company"
                autoCapitalize="none"
                autoCorrect="off"
                disabled={isPending}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--input-bg)",
                  color: "var(--fg)",
                  fontSize: "0.925rem",
                  outline: "none",
                  transition: "border-color 0.15s ease",
                }}
              />
            </div>

            {/* Password Input */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "6px",
                }}
              >
                <label
                  htmlFor="password"
                  style={{
                    fontSize: "0.825rem",
                    fontWeight: 600,
                    color: "var(--fg-muted)",
                  }}
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "var(--fg-subtle)",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isPending}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--input-bg)",
                  color: "var(--fg)",
                  fontSize: "0.925rem",
                  outline: "none",
                  transition: "border-color 0.15s ease",
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending}
              style={{
                marginTop: "8px",
                padding: "12px 16px",
                borderRadius: "8px",
                background: "var(--accent)",
                color: "#031d15",
                fontWeight: 600,
                fontSize: "0.95rem",
                border: "none",
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "opacity 0.15s ease, transform 0.05s ease",
              }}
            >
              {isPending ? (
                <>
                  <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span>
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Enter Workspace →</span>
              )}
            </button>
          </form>

          {/* Help hints */}
          <div
            style={{
              marginTop: "24px",
              paddingTop: "20px",
              borderTop: "1px solid var(--border)",
              fontSize: "0.76rem",
              color: "var(--fg-subtle)",
              lineHeight: 1.5,
            }}
          >
            <div>
              <strong style={{ color: "var(--fg-muted)" }}>• Test Account (atulya):</strong> Pre-populated with Indian & foreign demo transactions, invoices, and anomalies.
            </div>
            <div style={{ marginTop: "6px" }}>
              <strong style={{ color: "var(--fg-muted)" }}>• Custom Account:</strong> Enter any custom username & password to work with a clean, unpopulated workspace ready for your own CSVs.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
