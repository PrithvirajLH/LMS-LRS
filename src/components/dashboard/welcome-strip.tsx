"use client";

import { motion } from "motion/react";

interface WelcomeStripProps {
  name: string;
  lastCourse?: string;
  lastModule?: string;
  daysUntilDeadline?: number;
  deadlineCourse?: string;
}

export function WelcomeStrip({
  name,
  lastCourse,
  lastModule,
  daysUntilDeadline,
  deadlineCourse,
}: WelcomeStripProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
      className="rounded-2xl px-10 py-8 mb-8"
      style={{
        backgroundColor: "var(--bg-dark)",
      }}
    >
      <div className="flex items-center justify-between gap-8">
        {/* Left: greeting + resume */}
        <div>
          {/* Eyebrow */}
          <div
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "11px",
              letterSpacing: "var(--tracking-widest)",
              textTransform: "uppercase" as const,
              color: "var(--teal-100)",
            }}
          >
            WELCOME BACK
          </div>

          {/* Name */}
          <h1
            className="mt-1"
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "var(--text-display-xl)",
              color: "var(--teal-50)",
              lineHeight: "var(--leading-tight)",
            }}
          >
            {name}
          </h1>

          {/* Resume prompt */}
          {lastCourse && (
            <div className="mt-3 flex items-center gap-3">
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "15px",
                  color: "var(--teal-100)",
                  lineHeight: "var(--leading-relaxed)",
                }}
              >
                Continue where you left off —{" "}
                <strong style={{ fontWeight: 700, color: "var(--teal-50)" }}>{lastCourse}</strong>
                {lastModule && (
                  <span style={{ color: "var(--stone-400)" }}> · {lastModule}</span>
                )}
              </p>
            </div>
          )}

          {/* Resume button */}
          {lastCourse && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-5 rounded-lg px-6 py-3 transition-colors duration-200"
              style={{
                fontFamily: "var(--font-label)",
                fontSize: "12px",
                letterSpacing: "var(--tracking-wide)",
                textTransform: "uppercase" as const,
                backgroundColor: "var(--teal-400)",
                color: "var(--teal-50)",
              }}
            >
              Resume Course
            </motion.button>
          )}
        </div>

        {/* Right: deadline alert */}
        {daysUntilDeadline !== undefined && deadlineCourse && (
          <div
            className="text-right shrink-0"
          >
            <div
              style={{
                fontFamily: "var(--font-label)",
                fontSize: "11px",
                letterSpacing: "var(--tracking-widest)",
                textTransform: "uppercase" as const,
                color: daysUntilDeadline <= 7 ? "var(--amber-200)" : "var(--teal-100)",
              }}
            >
              NEXT DEADLINE
            </div>
            <div
              className="mt-1"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-stat-xl)",
                fontWeight: 700,
                color: daysUntilDeadline <= 7 ? "var(--amber-200)" : "var(--teal-100)",
              }}
            >
              {daysUntilDeadline}
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 400,
                  marginLeft: "4px",
                }}
              >
                days
              </span>
            </div>
            <div
              className="mt-0.5"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-micro)",
                color: "var(--stone-400)",
              }}
            >
              {deadlineCourse}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
