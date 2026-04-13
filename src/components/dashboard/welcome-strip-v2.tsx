"use client";

import { motion } from "motion/react";
import Link from "next/link";

interface WelcomeStripV2Props {
  name: string;
  lastCourse?: string;
  lastModule?: string;
  daysUntilDeadline?: number;
  deadlineCourse?: string;
  resumeCourseId?: string;
}

export function WelcomeStripV2({
  name,
  lastCourse,
  lastModule,
  daysUntilDeadline,
  deadlineCourse,
  resumeCourseId,
}: WelcomeStripV2Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
      className="rounded-2xl px-10 py-8 mb-8 relative overflow-hidden"
      style={{
        backgroundColor: "var(--bg-obsidian, var(--bg-dark))",
      }}
    >
      {/* Subtle animated gradient overlay */}
      <motion.div
        className="absolute inset-0 opacity-20"
        style={{
          background: "radial-gradient(ellipse at 20% 50%, var(--teal-400), transparent 60%), radial-gradient(ellipse at 80% 20%, var(--slate-400), transparent 50%)",
          backgroundSize: "200% 200%",
        }}
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <div className="flex items-center justify-between gap-8 relative z-10">
        {/* Left: greeting + resume */}
        <div>
          <div
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "11px",
              letterSpacing: "var(--tracking-widest)",
              textTransform: "uppercase" as const,
              color: "var(--text-on-dark-muted, var(--teal-100))",
            }}
          >
            WELCOME BACK
          </div>

          <h1
            className="mt-1"
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "var(--text-display-xl)",
              color: "var(--text-on-dark, var(--teal-50))",
              lineHeight: "var(--leading-tight)",
            }}
          >
            {name}
          </h1>

          {lastCourse && (
            <div className="mt-3">
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "15px",
                  color: "var(--text-on-dark-muted, var(--teal-100))",
                  lineHeight: "var(--leading-relaxed)",
                }}
              >
                Continue where you left off —{" "}
                <strong style={{ fontWeight: 700, color: "var(--text-on-dark, var(--teal-50))" }}>{lastCourse}</strong>
                {lastModule && (
                  <span style={{ color: "var(--stone-400)" }}> · {lastModule}</span>
                )}
              </p>
            </div>
          )}

          {/* Resume button */}
          {lastCourse && (
            <Link href={resumeCourseId ? `/play?courseId=${resumeCourseId}` : "/learn/training"}>
              <motion.span
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-5 rounded-lg px-6 py-3 transition-colors duration-200 inline-block"
                style={{
                  fontFamily: "var(--font-label)",
                  fontSize: "12px",
                  letterSpacing: "var(--tracking-wide)",
                  textTransform: "uppercase" as const,
                  backgroundColor: "var(--btn-secondary, var(--teal-400))",
                  color: "var(--teal-50)",
                }}
              >
                Resume Course
              </motion.span>
            </Link>
          )}
        </div>

        {/* Right: deadline */}
        {daysUntilDeadline !== undefined && deadlineCourse && (
          <div className="text-right shrink-0">
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
                fontSize: "12px",
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
