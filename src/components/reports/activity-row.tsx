"use client";

import { motion } from "motion/react";

interface ActivityRowProps {
  course: string;
  action: string;
  date: string;
  detail?: string;
  index: number;
}

const actionColors: Record<string, { bg: string; text: string }> = {
  completed: { bg: "#E8F0E8", text: "#3A6A5A" },
  passed: { bg: "#E8F0E8", text: "#3A6A5A" },
  failed: { bg: "var(--amber-50)", text: "var(--amber-600)" },
  started: { bg: "var(--teal-50)", text: "var(--teal-600)" },
  resumed: { bg: "var(--teal-50)", text: "var(--teal-600)" },
  attempted: { bg: "var(--stone-100)", text: "var(--stone-600)" },
};

export function ActivityRow({ course, action, date, detail, index }: ActivityRowProps) {
  const colors = actionColors[action] || actionColors.attempted;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className="flex items-center gap-4 py-3 px-4 rounded-xl transition-colors duration-150 hover:bg-[var(--teal-50)]"
    >
      {/* Timestamp */}
      <span
        className="w-32 shrink-0"
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "12px",
          color: "var(--text-muted)",
        }}
      >
        {new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        <span className="ml-1.5" style={{ color: "var(--border-strong)" }}>
          {new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </span>

      {/* Action badge */}
      <span
        className="rounded-full px-2.5 py-0.5 shrink-0"
        style={{
          fontFamily: "var(--font-label)",
          fontSize: "9px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          backgroundColor: colors.bg,
          color: colors.text,
        }}
      >
        {action}
      </span>

      {/* Course name */}
      <span
        className="flex-1 truncate"
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "13px",
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        {course}
      </span>

      {/* Detail */}
      {detail && (
        <span
          className="shrink-0"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "12px",
            color: "var(--text-muted)",
          }}
        >
          {detail}
        </span>
      )}
    </motion.div>
  );
}
