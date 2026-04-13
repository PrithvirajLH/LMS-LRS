"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { CompletionCard } from "@/components/completions/completion-card";
import { IconCertificate, IconClock, IconTrophy } from "@tabler/icons-react";

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
}

const completions: Completion[] = [
  {
    id: "1",
    title: "Infection Control Annual Review",
    category: "Compliance",
    completedDate: "2026-03-28",
    score: 92,
    credits: 2,
    duration: "25 min",
    accreditation: "CMS",
    expiresDate: "2027-03-28",
  },
  {
    id: "2",
    title: "Fire Safety & Emergency Procedures",
    category: "Safety",
    completedDate: "2026-03-15",
    score: 88,
    credits: 2,
    duration: "20 min",
    expiresDate: "2027-03-15",
  },
  {
    id: "3",
    title: "HIPAA Privacy Basics",
    category: "Compliance",
    completedDate: "2026-02-10",
    score: 95,
    credits: 2,
    duration: "20 min",
    accreditation: "CMS",
    expiresDate: "2027-02-10",
  },
  {
    id: "4",
    title: "Hand Hygiene Essentials",
    category: "Clinical Skills",
    completedDate: "2026-01-22",
    score: 100,
    credits: 1,
    duration: "10 min",
    accreditation: "ANCC",
  },
  {
    id: "5",
    title: "Workplace Violence Prevention",
    category: "Safety",
    completedDate: "2025-12-05",
    score: 85,
    credits: 2,
    duration: "30 min",
  },
  {
    id: "6",
    title: "Cultural Sensitivity in Senior Care",
    category: "Clinical Skills",
    completedDate: "2025-11-18",
    score: 90,
    credits: 2,
    duration: "25 min",
    accreditation: "ANCC",
    expiresDate: "2026-05-18",
  },
];

export default function CompletionsPage() {
  const [sortBy, setSortBy] = useState<"date" | "score" | "credits">("date");

  const sorted = useMemo(() => {
    return [...completions].sort((a, b) => {
      if (sortBy === "date") return new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime();
      if (sortBy === "score") return (b.score || 0) - (a.score || 0);
      if (sortBy === "credits") return b.credits - a.credits;
      return 0;
    });
  }, [sortBy]);

  const totalCredits = completions.reduce((sum, c) => sum + c.credits, 0);
  const avgScore = Math.round(completions.reduce((sum, c) => sum + (c.score || 0), 0) / completions.length);
  const totalHours = completions.reduce((sum, c) => {
    const mins = parseInt(c.duration);
    return sum + (isNaN(mins) ? 0 : mins);
  }, 0);

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "var(--text-display-l)",
            color: "var(--text-primary)",
            lineHeight: "var(--leading-tight)",
          }}
        >
          Completions
        </h1>
        <p
          className="mt-2"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "15px",
            color: "var(--text-body)",
          }}
        >
          Your training history and earned certificates.
        </p>
      </motion.div>

      {/* Summary cards */}
      <motion.div
        className="grid grid-cols-3 gap-4 mt-6 mb-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div
          className="rounded-xl px-6 py-5 flex items-center gap-4"
          style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--teal-50)" }}>
            <IconCertificate size={22} stroke={1.5} style={{ color: "#445A73" }} />
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)" }}>Certificates</div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-stat-l)", fontWeight: 700, color: "var(--text-primary)" }}>{completions.length}</div>
          </div>
        </div>

        <div
          className="rounded-xl px-6 py-5 flex items-center gap-4"
          style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--teal-50)" }}>
            <IconTrophy size={22} stroke={1.5} style={{ color: "#445A73" }} />
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)" }}>Avg. Score</div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-stat-l)", fontWeight: 700, color: "var(--text-primary)" }}>{avgScore}%</div>
          </div>
        </div>

        <div
          className="rounded-xl px-6 py-5 flex items-center gap-4"
          style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--teal-50)" }}>
            <IconClock size={22} stroke={1.5} style={{ color: "#445A73" }} />
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)" }}>Credits Earned</div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-stat-l)", fontWeight: 700, color: "var(--text-primary)" }}>{totalCredits}</div>
          </div>
        </div>
      </motion.div>

      {/* Sort row */}
      <div className="flex items-center justify-between mb-5">
        <span style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-muted)" }}>
          {completions.length} completed courses · {Math.round(totalHours / 60 * 10) / 10} hours of training
        </span>
        <div className="flex items-center gap-2">
          {(["date", "score", "credits"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setSortBy(opt)}
              className="rounded-full px-4 py-2 transition-colors duration-200"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "12px",
                fontWeight: 600,
                backgroundColor: sortBy === opt ? "var(--btn-primary)" : "var(--bg-raised)",
                color: sortBy === opt ? "var(--deep-50)" : "var(--text-muted)",
                border: sortBy === opt ? "1px solid var(--btn-primary)" : "1px solid var(--border-default)",
              }}
            >
              {opt === "date" ? "Recent" : opt === "score" ? "Score" : "Credits"}
            </button>
          ))}
        </div>
      </div>

      {/* Completion list */}
      <div className="space-y-4">
        {sorted.map((completion, idx) => (
          <CompletionCard
            key={completion.id}
            title={completion.title}
            category={completion.category}
            completedDate={completion.completedDate}
            score={completion.score}
            credits={completion.credits}
            duration={completion.duration}
            accreditation={completion.accreditation}
            expiresDate={completion.expiresDate}
            index={idx}
          />
        ))}
      </div>
    </div>
  );
}
