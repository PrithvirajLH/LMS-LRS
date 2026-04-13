"use client";

import { motion } from "motion/react";

export type CourseStatus = "in_progress" | "completed" | "overdue" | "not_started" | "due_soon";

interface CourseTimelineCardProps {
  title: string;
  description: string;
  category: string;
  duration: string;
  credits: number;
  creditsEarned: number;
  progress: number;
  status: CourseStatus;
  dueIn?: string;
  currentModule?: string;
  color: string; // gradient class like "from-teal-600 to-teal-400"
  index: number;
}

const statusConfig: Record<CourseStatus, { label: string; bg: string; text: string; border: string; dot: string }> = {
  in_progress: {
    label: "IN PROGRESS",
    bg: "var(--teal-50)",
    text: "var(--teal-600)",
    border: "var(--teal-100)",
    dot: "var(--teal-400)",
  },
  completed: {
    label: "COMPLETED",
    bg: "var(--teal-50)",
    text: "#445A73",
    border: "var(--teal-100)",
    dot: "#445A73",
  },
  overdue: {
    label: "OVERDUE",
    bg: "var(--amber-50)",
    text: "var(--amber-600)",
    border: "var(--amber-100)",
    dot: "var(--amber-400)",
  },
  due_soon: {
    label: "DUE SOON",
    bg: "var(--amber-50)",
    text: "var(--amber-600)",
    border: "var(--amber-100)",
    dot: "var(--amber-200)",
  },
  not_started: {
    label: "NOT STARTED",
    bg: "var(--stone-100)",
    text: "var(--stone-600)",
    border: "var(--stone-200)",
    dot: "var(--stone-200)",
  },
};

export function CourseTimelineCard({
  title,
  description,
  category,
  duration,
  credits,
  creditsEarned,
  progress,
  status,
  dueIn,
  currentModule,
  color,
  index,
}: CourseTimelineCardProps) {
  const config = statusConfig[status];
  const actionLabel = status === "completed" ? "VIEW CERTIFICATE" : status === "not_started" ? "START" : "CONTINUE";

  return (
    <motion.div
      className="flex gap-5"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.2, 0, 0, 1] }}
    >
      {/* Timeline node + line */}
      <div className="flex flex-col items-center shrink-0 w-8">
        <div
          className="w-4 h-4 rounded-full border-[3px] mt-6 shrink-0"
          style={{
            borderColor: config.dot,
            backgroundColor: status === "in_progress" || status === "completed" ? config.dot : "var(--bg-raised)",
          }}
        />
        <div
          className="w-[2px] flex-1 mt-1"
          style={{ backgroundColor: "var(--stone-200)" }}
        />
      </div>

      {/* Card */}
      <div
        className="flex-1 rounded-2xl overflow-hidden mb-4"
        style={{
          backgroundColor: "var(--bg-raised)",
          border: `1px solid var(--border-default)`,
        }}
      >
        {/* Card header with color bar */}
        <div className="flex items-stretch">
          {/* Color accent bar */}
          <div
            className={`w-2 shrink-0 bg-gradient-to-b ${color}`}
          />

          {/* Content */}
          <div className="flex-1 p-6">
            <div className="flex items-start justify-between gap-4">
              {/* Left: title + meta */}
              <div className="flex-1 min-w-0">
                {/* Category + status */}
                <div className="flex items-center gap-2 mb-2">
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
                      border: `1px solid ${config.border}`,
                    }}
                  >
                    {config.label}
                  </span>
                  {dueIn && (
                    <span
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "12px",
                        color: status === "overdue" ? "var(--amber-600)" : "var(--text-muted)",
                      }}
                    >
                      {dueIn}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "17px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    lineHeight: "var(--leading-snug)",
                  }}
                >
                  {title}
                </h3>

                {/* Description */}
                <p
                  className="mt-1"
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "14px",
                    color: "var(--text-body)",
                    lineHeight: "var(--leading-relaxed)",
                  }}
                >
                  {description}
                </p>

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
                    Current: {currentModule}
                  </p>
                )}

                {/* Progress bar */}
                {status !== "not_started" && status !== "completed" && (
                  <div className="mt-3 flex items-center gap-3">
                    <div
                      className="flex-1 h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: "var(--stone-100)" }}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: config.dot }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, delay: 0.3 + index * 0.08, ease: [0.2, 0, 0, 1] }}
                      />
                    </div>
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
                )}
              </div>

              {/* Right: credits */}
              <div className="text-center shrink-0 ml-4">
                <div
                  style={{
                    fontFamily: "var(--font-label)",
                    fontSize: "11px",
                    letterSpacing: "var(--tracking-wider)",
                    textTransform: "uppercase" as const,
                    color: "var(--text-muted)",
                  }}
                >
                  Credits
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-stat-m)",
                    fontWeight: 700,
                    color: status === "completed" ? "#445A73" : "var(--stone-900)",
                  }}
                >
                  {credits}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card footer */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{
            borderTop: "1px solid var(--border-default)",
            backgroundColor: "var(--bg-surface)",
          }}
        >
          <div className="flex items-center gap-4">
            <span
              className="flex items-center gap-1.5"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "12px",
                color: "var(--text-muted)",
              }}
            >
              <ClockIcon /> {duration}
            </span>
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "12px",
                color: "var(--text-muted)",
              }}
            >
              Credits earned: <strong style={{ fontWeight: 700, color: "var(--text-primary)" }}>{creditsEarned}</strong>
            </span>
          </div>

          <button
            className="rounded-lg px-5 py-2.5 transition-colors duration-200"
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "12px",
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

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
