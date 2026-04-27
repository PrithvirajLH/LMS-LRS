"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";

export type EnrollStatus = "enrolled" | "available" | "completed" | "in_progress";

interface CatalogCardProps {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  credits: number;
  modules: number;
  enrollStatus: EnrollStatus;
  accreditation?: string;
  color: string;
  thumbnailUrl?: string;
  index: number;
  onEnroll?: (id: string) => void;
}

const statusConfig: Record<EnrollStatus, { label: string; bg: string; text: string }> = {
  enrolled: { label: "ENROLLED", bg: "var(--teal-50)", text: "var(--teal-600)" },
  available: { label: "AVAILABLE", bg: "var(--stone-100)", text: "var(--stone-600)" },
  in_progress: { label: "IN PROGRESS", bg: "var(--teal-50)", text: "var(--teal-600)" },
  completed: { label: "COMPLETED", bg: "#E8F0E8", text: "#445A73" },
};

export function CatalogCard({
  id,
  title,
  description,
  category,
  duration,
  credits,
  modules,
  enrollStatus,
  accreditation,
  color,
  thumbnailUrl,
  index,
  onEnroll,
}: CatalogCardProps) {
  const config = statusConfig[enrollStatus];
  // Tap toggle for touch devices (no hover available)
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
      {/* ── IMAGE SECTION (top) — hover only here reveals description ── */}
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

        {/* Subtle gradient when no image — keeps the chips legible */}
        {!thumbnailUrl && (
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 40%)",
            }}
          />
        )}

        {/* Top chips: category + status */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <span
            className="rounded-full px-2.5 py-0.5 backdrop-blur-md truncate"
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "9px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              backgroundColor: "rgba(255,255,255,0.18)",
              color: "rgba(255,255,255,0.95)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            {category}
          </span>
          <span
            className="rounded-full px-2.5 py-0.5 shrink-0"
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "9px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              backgroundColor: config.bg,
              color: config.text,
            }}
          >
            {config.label}
          </span>
        </div>


        {/* Description overlay — appears ONLY on hover/tap of the image area */}
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
            {description || "No description provided."}
          </p>
        </div>
      </div>

      {/* ── CONTENT PANEL (bottom) ── */}
      <div className="p-4 flex-1 flex flex-col">
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

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--text-muted)" }}>
            {duration}
          </span>
          <span style={{ color: "var(--border-default)" }}>·</span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--text-muted)" }}>
            {modules} modules
          </span>
          {accreditation && (
            <>
              <span style={{ color: "var(--border-default)" }}>·</span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--text-muted)" }}>
                {accreditation}
              </span>
            </>
          )}
        </div>

        {/* Action — full-width at bottom */}
        {enrollStatus === "available" ? (
          <button
            onClick={() => onEnroll?.(id)}
            className="mt-auto w-full rounded-lg transition-opacity duration-200 hover:opacity-90"
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              backgroundColor: "var(--btn-primary)",
              color: "var(--teal-50)",
              paddingTop: "10px",
              paddingBottom: "10px",
              marginTop: "16px",
            }}
          >
            Enroll
          </button>
        ) : (
          <Link
            href={`/play?courseId=${id}`}
            className="mt-auto inline-block w-full text-center rounded-lg transition-opacity duration-200 hover:opacity-90"
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              backgroundColor: enrollStatus === "completed" ? "var(--bg-surface)" : "var(--btn-primary)",
              color: enrollStatus === "completed" ? "var(--text-muted)" : "var(--teal-50)",
              border: enrollStatus === "completed" ? "1px solid var(--border-default)" : "none",
              paddingTop: "10px",
              paddingBottom: "10px",
              marginTop: "16px",
            }}
          >
            {enrollStatus === "enrolled" ? "Start Course" : enrollStatus === "in_progress" ? "Continue" : "Review"}
          </Link>
        )}
      </div>
    </motion.div>
  );
}
