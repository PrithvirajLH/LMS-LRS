"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { IconAlertTriangle, IconCheck, IconLoader2 } from "@tabler/icons-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setSent(true);
      if (data.resetUrl) setResetUrl(data.resetUrl); // Dev mode only
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-8" style={{ backgroundColor: "var(--bg-page)" }}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[400px]">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-7 w-8 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm" style={{ backgroundColor: "var(--teal-400)" }} />
          <span style={{ fontFamily: "var(--font-label)", fontSize: "18px", color: "var(--teal-400)", letterSpacing: "0.04em" }}>Creative Minds</span>
        </div>

        {sent ? (
          <div>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: "#E8F0E8" }}>
              <IconCheck size={28} style={{ color: "#3A6A5A" }} />
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-l)", color: "var(--text-primary)" }}>Check your email</h2>
            <p className="mt-2" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-body)" }}>
              If an account exists with {email}, we&apos;ve sent a password reset link.
            </p>
            {resetUrl && (
              <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: "var(--amber-50)", border: "1px solid var(--amber-200)" }}>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--amber-600)", marginBottom: "8px" }}>Dev mode — reset link:</p>
                <Link href={resetUrl} className="break-all" style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--text-link)" }}>{resetUrl}</Link>
              </div>
            )}
            <Link href="/login" className="inline-block mt-6" style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-link)", fontWeight: 600 }}>
              Back to Sign In
            </Link>
          </div>
        ) : (
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-l)", color: "var(--text-primary)" }}>Forgot Password</h2>
            <p className="mt-2 mb-8" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-body)" }}>Enter your email and we&apos;ll send you a reset link.</p>

            {error && (
              <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-6" style={{ backgroundColor: "var(--amber-50)", border: "1px solid var(--amber-200)", color: "var(--amber-600)" }}>
                <IconAlertTriangle size={16} />
                <span style={{ fontFamily: "var(--font-body)", fontSize: "13px" }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-body)", display: "block", marginBottom: "6px" }}>Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="jane@company.com"
                  className="w-full rounded-lg px-4 py-3.5 outline-none" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-primary)", backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }} />
              </div>
              <button type="submit" disabled={loading || !email} className="w-full rounded-lg py-3.5 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ fontFamily: "var(--font-label)", fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: "var(--btn-primary)", color: "var(--teal-50)" }}>
                {loading ? <IconLoader2 size={16} className="animate-spin" /> : null}
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
            <p className="mt-6 text-center" style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)" }}>
              Remember your password? <Link href="/login" style={{ color: "var(--text-link)", fontWeight: 600 }}>Sign In</Link>
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
