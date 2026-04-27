"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import type { CourseStatus } from "@/components/dashboard/course-timeline-card";

interface CourseCardProps {
  courseId?: string;
  title: string;
  description?: string;
  category: string;
  duration: string;
  credits: number;
  progress: number;
  status: CourseStatus;
  dueIn?: string;
  currentModule?: string;
  color: string;
  thumbnailUrl?: string;
  index: number;
}

const statusConfig: Record<CourseStatus, { label: string; bg: string; text: string; dot: string }> = {
  in_progress: { label: "IN PROGRESS", bg: "var(--teal-50)",   text: "var(--teal-600)",   dot: "var(--teal-400)" },
  completed:   { label: "COMPLETED",   bg: "var(--teal-50)",   text: "#445A73",            dot: "#445A73" },
  overdue:     { label: "OVERDUE",     bg: "var(--amber-50)",  text: "var(--amber-600)",   dot: "var(--amber-400)" },
  due_soon:    { label: "DUE SOON",    bg: "var(--amber-50)",  text: "var(--amber-600)",   dot: "var(--amber-200)" },
  not_started: { label: "NOT STARTED", bg: "var(--stone-100)", text: "var(--stone-600)",   dot: "var(--stone-200)" },
};

export function CourseCard({
  title,
  courseId,
  description,
  category,
  duration,
  credits,
  progress,
  status,
  dueIn,
  currentModule,
  color,
  thumbnailUrl,
  index,
}: CourseCardProps) {
  const config = statusConfig[status];
  const actionLabel = status === "completed" ? "VIEW" : status === "not_started" ? "START" : "CONTINUE";
  const [tapped, setTapped] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{
        layout: { type: "spring", damping: 28, stiffness: 220, mass: 0.7 },
        opacity: { duration: 0.3 },
      }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="rounded-2xl overflow-hidden flex flex-col h-full hover:shadow-xl hover:shadow-black/[0.08]"
      style={{
        backgroundColor: "var(--bg-raised)",
        border: "1px solid var(--border-default)",
        transition: "box-shadow 0.3s",
      }}
    >
      {/* ── IMAGE SECTION (top) — hover here reveals description ── */}
      <div
        className="relative overflow-hidden cursor-pointer group/image"
        style={{
          aspectRatio: "16 / 9",
          backgroundColor: thumbnailUrl ? "#1a2838" : undefined,
        }}
        onClick={() => setTapped((t) => !t)}
      >
        <div
          className={`absolute inset-0 ${thumbnailUrl ? "bg-cover bg-center" : `bg-gradient-to-br ${color}`}`}
          style={thumbnailUrl ? { backgroundImage: `url(${thumbnailUrl})` } : undefined}
        />

        {!thumbnailUrl && (
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 40%)",
            }}
          />
        )}


        {/* Description overlay — only on image hover/tap */}
        {description && (
          <div
            className={`absolute inset-0 p-5 flex items-center transition-opacity duration-300 pointer-events-none ${tapped ? "opacity-100" : "opacity-0 group-hover/image:opacity-100"}`}
            style={{
              background: "linear-gradient(to bottom, rgba(10,22,40,0.86) 0%, rgba(10,22,40,0.92) 100%)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
            }}
          >
            <p
              className="line-clamp-5"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "13px",
                color: "rgba(255,255,255,0.94)",
                lineHeight: 1.65,
              }}
            >
              {description}
            </p>
          </div>
        )}
      </div>

      {/* ── CONTENT PANEL (bottom) ── */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Category + Status */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span
            className="truncate"
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
            className="rounded-full px-2.5 py-0.5 shrink-0"
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

        {/* Title — reserves 2 lines of space so buttons line up across cards */}
        <h3
          className="line-clamp-2"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "14px",
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.3,
            minHeight: "2.6em", // 2 lines × 1.3 line-height
          }}
        >
          {title}
        </h3>

        {currentModule && status !== "completed" && (
          <p className="mt-2 line-clamp-1" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--teal-400)" }}>
            {currentModule}
          </p>
        )}

        {/* Progress bar */}
        {status !== "not_started" && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
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
              <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 700, color: config.dot }}>
                {progress}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--stone-100)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: config.dot }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.2, 0, 0, 1] }}
              />
            </div>
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--text-muted)" }}>
            {duration}
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

        {/* Action — full-width at bottom */}
        <Link
          href={courseId ? `/play?courseId=${courseId}` : "#"}
          className="mt-auto pt-4 inline-block w-full text-center rounded-lg transition-opacity duration-200 hover:opacity-90"
          style={{
            fontFamily: "var(--font-label)",
            fontSize: "11px",
            letterSpacing: "var(--tracking-wide)",
            textTransform: "uppercase" as const,
            backgroundColor: status === "completed" ? "#445A73" : "var(--btn-primary)",
            color: status === "completed" ? "#EEF3F8" : "var(--teal-50)",
            paddingTop: "10px",
            paddingBottom: "10px",
            marginTop: "16px",
          }}
        >
          {actionLabel}
        </Link>
      </div>
    </motion.div>
  );
}
