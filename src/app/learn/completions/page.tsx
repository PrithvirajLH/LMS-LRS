"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "motion/react";
import { CompletionCard } from "@/components/completions/completion-card";
import { IconCertificate, IconClock, IconTrophy } from "@tabler/icons-react";

interface Completion {
  id: string; title: string; category: string; completedDate: string;
  score?: number; credits: number; duration: string; accreditation?: string;
}

export default function CompletionsPage() {
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"date" | "score" | "credits">("date");

  useEffect(() => {
    fetch("/api/learner/completions")
      .then((r) => r.json())
      .then((data) => { if (data.completions) setCompletions(data.completions); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    return [...completions].sort((a, b) => {
      if (sortBy === "date") return new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime();
      if (sortBy === "score") return (b.score || 0) - (a.score || 0);
      if (sortBy === "credits") return b.credits - a.credits;
      return 0;
    });
  }, [completions, sortBy]);

  const totalCredits = completions.reduce((sum, c) => sum + c.credits, 0);
  const avgScore = completions.length > 0 ? Math.round(completions.reduce((sum, c) => sum + (c.score || 0), 0) / completions.length) : 0;

  if (loading) {
    return <div className="p-6 md:p-10 max-w-[1200px] mx-auto"><div className="animate-pulse h-8 w-48 rounded" style={{ backgroundColor: "var(--bg-surface)" }} /></div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-l)", color: "var(--text-primary)" }}>Completions</h1>
        <p className="mt-2" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-body)" }}>Your training history and earned certificates.</p>
      </div>

      {completions.length > 0 ? (
        <>
          <div className="grid grid-cols-3 gap-4 mt-6 mb-8">
            {[
              { label: "Certificates", value: completions.length, icon: <IconCertificate size={22} stroke={1.5} style={{ color: "#445A73" }} /> },
              { label: "Avg. Score", value: `${avgScore}%`, icon: <IconTrophy size={22} stroke={1.5} style={{ color: "#445A73" }} /> },
              { label: "Credits Earned", value: totalCredits, icon: <IconClock size={22} stroke={1.5} style={{ color: "#445A73" }} /> },
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

          <div className="flex items-center justify-between mb-5">
            <span style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-muted)" }}>{completions.length} completed courses</span>
            <div className="flex items-center gap-2">
              {(["date", "score", "credits"] as const).map((opt) => (
                <button key={opt} onClick={() => setSortBy(opt)} className="rounded-full px-4 py-2 transition-colors duration-200" style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 600, backgroundColor: sortBy === opt ? "var(--btn-primary)" : "var(--bg-raised)", color: sortBy === opt ? "var(--deep-50)" : "var(--text-muted)", border: sortBy === opt ? "1px solid var(--btn-primary)" : "1px solid var(--border-default)" }}>
                  {opt === "date" ? "Recent" : opt === "score" ? "Score" : "Credits"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {sorted.map((c, idx) => (
              <CompletionCard key={c.id} title={c.title} category={c.category} completedDate={c.completedDate} score={c.score} credits={c.credits} duration={c.duration} accreditation={c.accreditation} index={idx} />
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
