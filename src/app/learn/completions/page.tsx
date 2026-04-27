"use client";

import { useState, useMemo, useEffect } from "react";
import { CompletionCard } from "@/components/completions/completion-card";
import { IconCertificate, IconClock, IconTrophy, IconAlertTriangle, IconRefresh } from "@tabler/icons-react";

type ExpirationStatus = "valid" | "expiring_soon" | "expired" | "no_expiry";

interface Completion {
  id: string;
  title: string;
  category: string;
  completedDate: string;
  score?: number;
  credits: number;
  duration: string;
  accreditation?: string;
  expiresDate?: string;
  expirationStatus: ExpirationStatus;
  daysUntilExpiry: number | null;
  validityPeriodMonths: number;
}

interface CompletionsSummary {
  total: number;
  valid: number;
  expiringSoon: number;
  expired: number;
  noExpiry: number;
}

export default function CompletionsPage() {
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [summary, setSummary] = useState<CompletionsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"date" | "score" | "credits" | "expiry">("date");
  const [filter, setFilter] = useState<"all" | "expiring" | "expired" | "valid">("all");
  const [renewing, setRenewing] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/learner/completions")
      .then((r) => r.json())
      .then((data) => {
        if (data.completions) setCompletions(data.completions);
        if (data.summary) setSummary(data.summary);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function renew(courseId: string) {
    setRenewing(courseId);
    try {
      const res = await fetch("/api/learner/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.message);
      } else {
        // Reload — the renewed course will now show as in_progress on /learn
        window.location.href = `/play?courseId=${encodeURIComponent(courseId)}`;
      }
    } catch {
      alert("Failed to renew enrollment");
    }
    setRenewing(null);
  }

  const sorted = useMemo(() => {
    let list = [...completions];
    if (filter === "expiring") list = list.filter((c) => c.expirationStatus === "expiring_soon");
    if (filter === "expired") list = list.filter((c) => c.expirationStatus === "expired");
    if (filter === "valid") list = list.filter((c) => c.expirationStatus === "valid" || c.expirationStatus === "no_expiry");
    return list.sort((a, b) => {
      if (sortBy === "date") return new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime();
      if (sortBy === "score") return (b.score || 0) - (a.score || 0);
      if (sortBy === "credits") return b.credits - a.credits;
      if (sortBy === "expiry") {
        // Sort soonest expiry first (expired at top, then expiring_soon, then valid)
        const at = a.expiresDate ? new Date(a.expiresDate).getTime() : Infinity;
        const bt = b.expiresDate ? new Date(b.expiresDate).getTime() : Infinity;
        return at - bt;
      }
      return 0;
    });
  }, [completions, sortBy, filter]);

  const totalCredits = completions.reduce((sum, c) => sum + c.credits, 0);
  const avgScore = completions.length > 0 ? Math.round(completions.reduce((sum, c) => sum + (c.score || 0), 0) / completions.length) : 0;
  const expiredCount = summary?.expired ?? 0;
  const expiringSoonCount = summary?.expiringSoon ?? 0;

  if (loading) {
    return <div className="p-6 md:p-10 max-w-[1200px] mx-auto"><div className="animate-pulse h-8 w-48 rounded" style={{ backgroundColor: "var(--bg-surface)" }} /></div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-l)", color: "var(--text-primary)" }}>Completions</h1>
        <p className="mt-2" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-body)" }}>Your training history and CE credit status.</p>
      </div>

      {/* CE expiration alert banner */}
      {(expiredCount > 0 || expiringSoonCount > 0) && (
        <div
          className="mt-6 rounded-2xl px-5 py-4 flex items-start gap-4"
          style={{
            backgroundColor: expiredCount > 0 ? "rgba(192, 74, 64, 0.06)" : "var(--amber-50)",
            border: expiredCount > 0 ? "1px solid rgba(192, 74, 64, 0.2)" : "1px solid var(--amber-100)",
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: expiredCount > 0 ? "rgba(192, 74, 64, 0.1)" : "var(--amber-100)" }}
          >
            <IconAlertTriangle size={20} stroke={1.5} style={{ color: expiredCount > 0 ? "#C04A40" : "var(--amber-600)" }} />
          </div>
          <div className="flex-1">
            <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
              {expiredCount > 0 && `${expiredCount} CE credit${expiredCount > 1 ? "s have" : " has"} expired`}
              {expiredCount > 0 && expiringSoonCount > 0 && " · "}
              {expiringSoonCount > 0 && `${expiringSoonCount} expiring within 60 days`}
            </p>
            <p className="mt-1" style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-body)" }}>
              Renew expired credits by retaking the courses to maintain compliance.
            </p>
          </div>
        </div>
      )}

      {completions.length > 0 ? (
        <>
          <div className="grid grid-cols-3 gap-4 mt-6 mb-8">
            {[
              { label: "Certificates", value: completions.length, icon: <IconCertificate size={22} stroke={1.5} style={{ color: "#445A73" }} /> },
              { label: "Avg. Score", value: `${avgScore}%`, icon: <IconTrophy size={22} stroke={1.5} style={{ color: "#445A73" }} /> },
              { label: "Need Renewal", value: expiredCount + expiringSoonCount, icon: <IconAlertTriangle size={22} stroke={1.5} style={{ color: expiredCount + expiringSoonCount > 0 ? "var(--amber-600)" : "#445A73" }} /> },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl px-6 py-5 flex items-center gap-4" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--teal-50)" }}>{stat.icon}</div>
                <div>
                  <div style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)" }}>{stat.label}</div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-stat-l)", fontWeight: 700, color: "var(--text-primary)" }}>{stat.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {([
              ["all", `All (${completions.length})`],
              ["valid", `Valid (${(summary?.valid ?? 0) + (summary?.noExpiry ?? 0)})`],
              ["expiring", `Expiring Soon (${expiringSoonCount})`],
              ["expired", `Expired (${expiredCount})`],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key as typeof filter)}
                className="rounded-full px-4 py-2 transition-colors duration-200"
                style={{
                  fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 600,
                  backgroundColor: filter === key ? "var(--btn-primary)" : "var(--bg-raised)",
                  color: filter === key ? "var(--deep-50)" : "var(--text-muted)",
                  border: filter === key ? "1px solid var(--btn-primary)" : "1px solid var(--border-default)",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mb-5">
            <span style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-muted)" }}>{sorted.length} {sorted.length === 1 ? "course" : "courses"}</span>
            <div className="flex items-center gap-2">
              {(["date", "expiry", "score", "credits"] as const).map((opt) => (
                <button key={opt} onClick={() => setSortBy(opt)} className="rounded-full px-4 py-2 transition-colors duration-200" style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 600, backgroundColor: sortBy === opt ? "var(--btn-primary)" : "var(--bg-raised)", color: sortBy === opt ? "var(--deep-50)" : "var(--text-muted)", border: sortBy === opt ? "1px solid var(--btn-primary)" : "1px solid var(--border-default)" }}>
                  {opt === "date" ? "Recent" : opt === "expiry" ? "Expiry" : opt === "score" ? "Score" : "Credits"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {sorted.map((c, idx) => (
              <div key={c.id} className="relative">
                <CompletionCard
                  title={c.title}
                  category={c.category}
                  completedDate={c.completedDate}
                  score={c.score}
                  credits={c.credits}
                  duration={c.duration}
                  accreditation={c.accreditation}
                  expiresDate={c.expiresDate || undefined}
                  index={idx}
                />
                {/* Renew button overlay for expired/expiring credits */}
                {(c.expirationStatus === "expired" || c.expirationStatus === "expiring_soon") && (
                  <div className="mt-2 flex items-center justify-end">
                    <button
                      onClick={() => renew(c.id)}
                      disabled={renewing === c.id}
                      className="flex items-center gap-2 rounded-[5px] px-4 py-2 transition-colors duration-200 hover:opacity-90"
                      style={{
                        fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase",
                        backgroundColor: c.expirationStatus === "expired" ? "#C04A40" : "var(--amber-600)",
                        color: "#fff",
                      }}
                    >
                      {renewing === c.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <IconRefresh size={14} stroke={2} />
                      )}
                      {c.expirationStatus === "expired" ? "Renew Now" : "Renew Early"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-12 text-center py-16 rounded-2xl" style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "16px", color: "var(--text-primary)", fontWeight: 600 }}>No completions yet</p>
          <p className="mt-2" style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-muted)" }}>
            Complete your assigned courses to see certificates and scores here.
          </p>
        </div>
      )}
    </div>
  );
}
