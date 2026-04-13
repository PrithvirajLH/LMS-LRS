"use client";

import { motion } from "motion/react";

interface ActivityRowProps {
  course: string;
  parentCourse?: string;
  action: string;
  date: string;
  detail?: string;
  index: number;
}

const actionColors: Record<string, { bg: string; text: string; label: string }> = {
  completed:   { bg: "#E8F0E8", text: "#3A6A5A", label: "Completed" },
  passed:      { bg: "#E8F0E8", text: "#3A6A5A", label: "Passed" },
  failed:      { bg: "var(--amber-50)", text: "var(--amber-600)", label: "Failed" },
  started:     { bg: "var(--teal-50)", text: "var(--teal-600)", label: "Started" },
  resumed:     { bg: "var(--teal-50)", text: "var(--teal-600)", label: "Resumed" },
  attempted:   { bg: "#EEF3F8", text: "#445A73", label: "Attempted" },
  experienced: { bg: "#EEF3F8", text: "#445A73", label: "Viewed" },
  answered:    { bg: "#EEF3F8", text: "#445A73", label: "Answered" },
  interacted:  { bg: "#EEF3F8", text: "#445A73", label: "Interacted" },
  terminated:  { bg: "var(--stone-100)", text: "var(--stone-600)", label: "Exited" },
  initialized: { bg: "var(--teal-50)", text: "var(--teal-600)", label: "Launched" },
  suspended:   { bg: "var(--stone-100)", text: "var(--stone-600)", label: "Paused" },
  left:        { bg: "var(--stone-100)", text: "var(--stone-600)", label: "Left" },
  attended:    { bg: "#EEF3F8", text: "#445A73", label: "Attended" },
};

const defaultAction = { bg: "var(--stone-100)", text: "var(--stone-600)", label: "" };

export function ActivityRow({ course, parentCourse, action, date, detail, index }: ActivityRowProps) {
  const config = actionColors[action] || defaultAction;
  const displayLabel = config.label || action;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className="flex items-center gap-4 py-4 px-6 transition-colors duration-150 hover:bg-[var(--teal-50)]"
    >
      {/* Timestamp */}
      <div className="w-36 shrink-0">
        <div style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-primary)" }}>
          {new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--text-muted)" }}>
          {new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
      </div>

      {/* Action badge */}
      <span
        className="rounded-full px-3 py-1 shrink-0 w-24 text-center"
        style={{
          fontFamily: "var(--font-label)",
          fontSize: "9px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          backgroundColor: config.bg,
          color: config.text,
        }}
      >
        {displayLabel}
      </span>

      {/* Activity name + parent course */}
      <div className="flex-1 min-w-0">
        <div
          className="truncate"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {course}
        </div>
        {parentCourse && parentCourse !== course && (
          <div
            className="truncate mt-0.5"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "12px",
              color: "var(--text-muted)",
            }}
          >
            {parentCourse}
          </div>
        )}
      </div>

      {/* Detail */}
      {detail && (
        <span
          className="shrink-0 rounded-lg px-2.5 py-1"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--text-primary)",
            backgroundColor: "var(--bg-surface)",
          }}
        >
          {detail}
        </span>
      )}
    </motion.div>
  );
}
