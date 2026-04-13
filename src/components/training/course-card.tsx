"use client";

import { motion } from "motion/react";
import type { CourseStatus } from "@/components/dashboard/course-timeline-card";

interface CourseCardProps {
  title: string;
  category: string;
  duration: string;
  credits: number;
  progress: number;
  status: CourseStatus;
  dueIn?: string;
  currentModule?: string;
  color: string;
  index: number;
}

const statusConfig: Record<CourseStatus, { label: string; bg: string; text: string; dot: string }> = {
  in_progress: {
    label: "IN PROGRESS",
    bg: "var(--teal-50)",
    text: "var(--teal-600)",
    dot: "var(--teal-400)",
  },
  completed: {
    label: "COMPLETED",
    bg: "var(--teal-50)",
    text: "#445A73",
    dot: "#445A73",
  },
  overdue: {
    label: "OVERDUE",
    bg: "var(--amber-50)",
    text: "var(--amber-600)",
    dot: "var(--amber-400)",
  },
  due_soon: {
    label: "DUE SOON",
    bg: "var(--amber-50)",
    text: "var(--amber-600)",
    dot: "var(--amber-200)",
  },
  not_started: {
    label: "NOT STARTED",
    bg: "var(--stone-100)",
    text: "var(--stone-600)",
    dot: "var(--stone-200)",
  },
};

export function CourseCard({
  title,
  category,
  duration,
  credits,
  progress,
  status,
  dueIn,
  currentModule,
  color,
  index,
}: CourseCardProps) {
  const config = statusConfig[status];
  const actionLabel = status === "completed" ? "VIEW" : status === "not_started" ? "START" : "CONTINUE";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.25, ease: "easeIn" } }}
      transition={{
        layout: { type: "spring", damping: 30, stiffness: 200, mass: 0.8 },
        opacity: { duration: 0.4, ease: "easeOut" },
        y: { duration: 0.35, delay: index * 0.06, ease: [0.2, 0, 0, 1] },
      }}
      className="rounded-2xl overflow-hidden transition-shadow duration-300 hover:shadow-lg hover:shadow-black/[0.04]"
      style={{
        backgroundColor: "var(--bg-raised)",
        border: "1px solid var(--border-default)",
      }}
    >
      {/* Color header bar */}
      <div className={`h-2 bg-gradient-to-r ${color}`} />

      <div className="p-6">
        {/* Category + Status */}
        <div className="flex items-center justify-between mb-3">
          <span
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "10px",
              letterSpacing: "var(--tracking-widest)",
              textTransform: "uppercase" as const,
              color: "var(--text-muted)",
            }}
          >
            {category}
          </span>
          <span
            className="rounded-full px-2.5 py-0.5"
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "10px",
              letterSpacing: "var(--tracking-wide)",
              textTransform: "uppercase" as const,
              backgroundColor: config.bg,
              color: config.text,
            }}
          >
            {config.label}
          </span>
        </div>

        {/* Title */}
        <h3
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "16px",
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: "var(--leading-snug)",
          }}
        >
          {title}
        </h3>

        {/* Current module */}
        {currentModule && status !== "completed" && (
          <p
            className="mt-2"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "12px",
              color: "var(--teal-400)",
            }}
          >
            {currentModule}
          </p>
        )}

        {/* Progress bar */}
        {status !== "not_started" && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span
                style={{
                  fontFamily: "var(--font-label)",
                  fontSize: "10px",
                  letterSpacing: "var(--tracking-wider)",
                  textTransform: "uppercase" as const,
                  color: "var(--text-muted)",
                }}
              >
                Progress
              </span>
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: config.dot,
                }}
              >
                {progress}%
              </span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: "var(--stone-100)" }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: config.dot }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, delay: 0.2 + index * 0.06, ease: [0.2, 0, 0, 1] }}
              />
            </div>
          </div>
        )}

        {/* Footer: meta + action */}
        <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: "1px solid var(--border-default)" }}>
          <div className="flex items-center gap-3">
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "12px",
                color: "var(--text-muted)",
              }}
            >
              {duration}
            </span>
            <span style={{ color: "var(--stone-200)" }}>·</span>
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "12px",
                color: "var(--text-muted)",
              }}
            >
              {credits} credits
            </span>
            {dueIn && (
              <>
                <span style={{ color: "var(--stone-200)" }}>·</span>
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "12px",
                    fontWeight: status === "overdue" ? 700 : 400,
                    color: status === "overdue" ? "var(--amber-600)" : "var(--text-muted)",
                  }}
                >
                  {dueIn}
                </span>
              </>
            )}
          </div>

          <button
            className="rounded-lg px-4 py-2 transition-colors duration-200"
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "11px",
              letterSpacing: "var(--tracking-wide)",
              textTransform: "uppercase" as const,
              backgroundColor: status === "completed" ? "#445A73" : "var(--btn-primary)",
              color: status === "completed" ? "#EEF3F8" : "var(--teal-50)",
            }}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
