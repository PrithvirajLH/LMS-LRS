"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion } from "motion/react";
import { IconAlertTriangle, IconLoader2 } from "@tabler/icons-react";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-page)" }}>
      <IconLoader2 size={24} className="animate-spin" style={{ color: "var(--teal-400)" }} />
    </div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/learn";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed");
        setLoading(false);
        return;
      }

      // Redirect based on role
      if (data.user.role === "instructor" || data.user.role === "admin") {
        router.push(redirect.startsWith("/instructor") || redirect.startsWith("/admin") ? redirect : "/instructor");
      } else {
        router.push(redirect.startsWith("/learn") || redirect.startsWith("/play") ? redirect : "/learn");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--bg-page)" }}>
      {/* Left: branding panel */}
      <div
        className="hidden lg:flex lg:w-[480px] shrink-0 flex-col justify-between p-12"
        style={{ backgroundColor: "var(--bg-obsidian, #0A1628)" }}
      >
        <div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-9 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm" style={{ backgroundColor: "var(--teal-400)" }} />
            <span style={{ fontFamily: "var(--font-label)", fontSize: "20px", color: "var(--text-on-dark, #EAF0F6)", letterSpacing: "0.04em" }}>
              Creative Minds
            </span>
          </div>
          <h1
            className="mt-16"
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "36px",
              color: "var(--text-on-dark, #EAF0F6)",
              lineHeight: 1.2,
            }}
          >
            Professional Training,
            <br />Simplified.
          </h1>
          <p
            className="mt-4 max-w-[320px]"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "15px",
              color: "var(--text-on-dark-muted, #88A8C8)",
              lineHeight: 1.65,
            }}
          >
            Your organization&apos;s learning management system for compliance training, certifications, and professional development.
          </p>
        </div>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--deep-400, #3A6080)" }}>
          &copy; {new Date().getFullYear()} Creative Minds Learning Hub
        </p>
      </div>

      {/* Right: login form */}
      <div className="flex-1 flex items-center justify-center px-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[400px]"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="h-7 w-8 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm" style={{ backgroundColor: "var(--teal-400)" }} />
            <span style={{ fontFamily: "var(--font-label)", fontSize: "18px", color: "var(--teal-400)", letterSpacing: "0.04em" }}>
              Creative Minds
            </span>
          </div>

          <h2 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-l)", color: "var(--text-primary)" }}>
            Sign In
          </h2>
          <p className="mt-2 mb-8" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-body)" }}>
            Enter your email or employee ID to continue.
          </p>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-xl px-4 py-3 mb-6"
              style={{ backgroundColor: "var(--amber-50)", border: "1px solid var(--amber-200)", color: "var(--amber-600)" }}
            >
              <IconAlertTriangle size={16} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: "13px" }}>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Identifier field */}
            <div>
              <label style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-body)", display: "block", marginBottom: "6px" }}>
                Email or Employee ID
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="jane@company.com or EMP-001"
                required
                autoFocus
                className="w-full rounded-lg px-4 py-3.5 outline-none transition-all duration-200 focus:ring-2"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "15px",
                  color: "var(--text-primary)",
                  backgroundColor: "var(--bg-raised)",
                  border: "1px solid var(--border-default)",
                  // @ts-expect-error CSS variable
                  "--tw-ring-color": "var(--teal-200)",
                }}
              />
            </div>

            {/* Password field */}
            <div>
              <label style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-body)", display: "block", marginBottom: "6px" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full rounded-lg px-4 py-3.5 outline-none transition-all duration-200 focus:ring-2"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "15px",
                  color: "var(--text-primary)",
                  backgroundColor: "var(--bg-raised)",
                  border: "1px solid var(--border-default)",
                  // @ts-expect-error CSS variable
                  "--tw-ring-color": "var(--teal-200)",
                }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !identifier || !password}
              className="w-full rounded-lg py-3.5 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                fontFamily: "var(--font-label)",
                fontSize: "12px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                backgroundColor: "var(--btn-primary)",
                color: "var(--teal-50)",
              }}
            >
              {loading ? <IconLoader2 size={16} className="animate-spin" /> : null}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)" }}>
              <a href="/forgot-password" style={{ color: "var(--text-link, var(--teal-400))", fontWeight: 600 }}>Forgot your password?</a>
            </p>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)" }}>
              Don&apos;t have an account?{" "}
              <a href="/register" style={{ color: "var(--text-link, var(--teal-400))", fontWeight: 600 }}>Register</a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
