"use client";

import { motion } from "motion/react";
import { IconCertificate, IconDownload, IconCalendar, IconClock } from "@tabler/icons-react";

interface CompletionCardProps {
  title: string;
  category: string;
  completedDate: string;
  score?: number;
  credits: number;
  duration: string;
  accreditation?: string;
  expiresDate?: string;
  index: number;
}

export function CompletionCard({
  title,
  category,
  completedDate,
  score,
  credits,
  duration,
  accreditation,
  expiresDate,
  index,
}: CompletionCardProps) {
  const isExpiring = expiresDate && new Date(expiresDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="rounded-2xl overflow-hidden transition-shadow duration-300 hover:shadow-lg hover:shadow-black/[0.04]"
      style={{
        backgroundColor: "var(--bg-raised)",
        border: "1px solid var(--border-default)",
      }}
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          {/* Left: info */}
          <div className="flex-1 min-w-0">
            {/* Category */}
            <span
              style={{
                fontFamily: "var(--font-label)",
                fontSize: "10px",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              {category}
            </span>

            {/* Title */}
            <h3
              className="mt-1"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1.3,
              }}
            >
              {title}
            </h3>

            {/* Meta row */}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
                <IconCalendar size={14} stroke={1.5} />
                Completed {new Date(completedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <span style={{ color: "var(--border-default)" }}>·</span>
              <span className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
                <IconClock size={14} stroke={1.5} />
                {duration}
              </span>
              {accreditation && (
                <>
                  <span style={{ color: "var(--border-default)" }}>·</span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
                    {accreditation}
                  </span>
                </>
              )}
            </div>

            {/* Expiry warning */}
            {expiresDate && (
              <div
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5"
                style={{
                  backgroundColor: isExpiring ? "var(--amber-50)" : "var(--stone-100)",
                  color: isExpiring ? "var(--amber-600)" : "var(--text-muted)",
                  fontFamily: "var(--font-body)",
                  fontSize: "12px",
                }}
              >
                {isExpiring ? "⚠ " : ""}
                Expires {new Date(expiresDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            )}
          </div>

          {/* Right: score + credits */}
          <div className="flex items-center gap-5 shrink-0">
            {/* Score */}
            {score !== undefined && (
              <div className="text-center">
                <div
                  style={{
                    fontFamily: "var(--font-label)",
                    fontSize: "9px",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                  }}
                >
                  Score
                </div>
                <div
                  className="mt-1"
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-stat-m)",
                    fontWeight: 700,
                    color: score >= 80 ? "#445A73" : "var(--amber-600)",
                  }}
                >
                  {score}%
                </div>
              </div>
            )}


            {/* Certificate icon */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "var(--teal-50)" }}
            >
              <IconCertificate size={24} stroke={1.5} style={{ color: "#445A73" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-6 py-3"
        style={{ borderTop: "1px solid var(--border-default)", backgroundColor: "var(--bg-surface)" }}
      >
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "12px",
            color: "var(--text-muted)",
          }}
        >
          Completed
        </span>
        <button
          className="flex items-center gap-2 rounded-[5px] px-4 py-2 transition-colors duration-200"
          style={{
            fontFamily: "var(--font-label)",
            fontSize: "11px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            backgroundColor: "#445A73",
            color: "#EEF3F8",
          }}
        >
          <IconDownload size={14} stroke={1.5} />
          Certificate
        </button>
      </div>
    </motion.div>
  );
}
