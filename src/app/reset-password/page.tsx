"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { IconAlertTriangle, IconCheck, IconLoader2 } from "@tabler/icons-react";
import Link from "next/link";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-page)" }}><IconLoader2 size={24} className="animate-spin" style={{ color: "var(--teal-400)" }} /></div>}>
      <ResetForm />
    </Suspense>
  );
}

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); setLoading(false); return; }
      setSuccess(true);
    } catch {
      setError("Something went wrong.");
    }
    setLoading(false);
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-page)" }}>
        <div className="text-center">
          <p style={{ fontFamily: "var(--font-body)", fontSize: "16px", color: "var(--text-primary)", fontWeight: 600 }}>Invalid reset link</p>
          <Link href="/forgot-password" className="mt-4 inline-block" style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-link)" }}>Request a new one</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-8" style={{ backgroundColor: "var(--bg-page)" }}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[400px]">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-7 w-8 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm" style={{ backgroundColor: "var(--teal-400)" }} />
          <span style={{ fontFamily: "var(--font-label)", fontSize: "18px", color: "var(--teal-400)", letterSpacing: "0.04em" }}>Creative Minds</span>
        </div>

        {success ? (
          <div>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: "#E8F0E8" }}>
              <IconCheck size={28} style={{ color: "#3A6A5A" }} />
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-l)", color: "var(--text-primary)" }}>Password Reset</h2>
            <p className="mt-2" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-body)" }}>Your password has been updated. You can now sign in.</p>
            <Link href="/login" className="inline-block mt-6 rounded-lg px-6 py-3" style={{ fontFamily: "var(--font-label)", fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: "var(--btn-primary)", color: "var(--teal-50)" }}>
              Sign In
            </Link>
          </div>
        ) : (
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-l)", color: "var(--text-primary)" }}>Set New Password</h2>
            <p className="mt-2 mb-8" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-body)" }}>Choose a new password for your account.</p>

            {error && (
              <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-6" style={{ backgroundColor: "var(--amber-50)", border: "1px solid var(--amber-200)", color: "var(--amber-600)" }}>
                <IconAlertTriangle size={16} /><span style={{ fontFamily: "var(--font-body)", fontSize: "13px" }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-body)", display: "block", marginBottom: "6px" }}>New Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Minimum 6 characters"
                  className="w-full rounded-lg px-4 py-3.5 outline-none" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-primary)", backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }} />
              </div>
              <div>
                <label style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-body)", display: "block", marginBottom: "6px" }}>Confirm Password</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
                  className="w-full rounded-lg px-4 py-3.5 outline-none" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-primary)", backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }} />
              </div>
              <button type="submit" disabled={loading || !password || !confirm} className="w-full rounded-lg py-3.5 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ fontFamily: "var(--font-label)", fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: "var(--btn-primary)", color: "var(--teal-50)" }}>
                {loading ? <IconLoader2 size={16} className="animate-spin" /> : null}
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
}
