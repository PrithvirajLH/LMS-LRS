"use client";

import { motion } from "motion/react";
import Link from "next/link";

export type EnrollStatus = "enrolled" | "available" | "completed";

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
  index: number;
  onEnroll?: (id: string) => void;
}

const statusConfig: Record<EnrollStatus, { label: string; bg: string; text: string }> = {
  enrolled: { label: "ENROLLED", bg: "var(--teal-50)", text: "var(--teal-600)" },
  available: { label: "AVAILABLE", bg: "var(--stone-100)", text: "var(--stone-600)" },
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
  index,
  onEnroll,
}: CatalogCardProps) {
  const config = statusConfig[enrollStatus];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.25 } }}
      transition={{
        layout: { type: "spring", damping: 30, stiffness: 200, mass: 0.8 },
        opacity: { duration: 0.35, delay: index * 0.05 },
        y: { duration: 0.35, delay: index * 0.05 },
      }}
      className="rounded-2xl overflow-hidden transition-shadow duration-300 hover:shadow-lg hover:shadow-black/[0.06] group flex flex-col"
      style={{
        backgroundColor: "var(--bg-raised)",
        border: "1px solid var(--border-default)",
      }}
    >
      {/* Color header */}
      <div className={`h-24 bg-gradient-to-br ${color} relative overflow-hidden`}>
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 40%)",
        }} />

        {/* Category + Status */}
        <div className="absolute top-3 left-4 right-4 flex items-center justify-between">
          <span
            className="rounded-full px-2.5 py-0.5 backdrop-blur-sm"
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "9px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              backgroundColor: "rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.9)",
            }}
          >
            {category}
          </span>
          <span
            className="rounded-full px-2.5 py-0.5"
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

        {/* Credits badge */}
        <div className="absolute bottom-3 right-4">
          <div
            className="rounded-lg px-2.5 py-1 backdrop-blur-sm"
            style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
          >
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "12px",
                fontWeight: 700,
                color: "rgba(255,255,255,0.9)",
              }}
            >
              {credits}
            </span>
            <span
              style={{
                fontFamily: "var(--font-label)",
                fontSize: "8px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.7)",
                marginLeft: "4px",
              }}
            >
              credits
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col">
        <h3
          className="line-clamp-2"
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

        <p
          className="mt-2 line-clamp-2"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "13px",
            color: "var(--text-body)",
            lineHeight: 1.65,
          }}
        >
          {description}
        </p>

        {/* Meta row — pinned to bottom of content area */}
        <div className="flex items-center gap-3 mt-auto pt-4">
          <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
            {duration}
          </span>
          <span style={{ color: "var(--border-default)" }}>·</span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
            {modules} modules
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
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderTop: "1px solid var(--border-default)", backgroundColor: "var(--bg-surface)" }}
      >
        {enrollStatus === "enrolled" ? (
          <Link href={`/play?courseId=${id}`}>
            <button
              className="rounded-[5px] px-5 py-2 transition-colors duration-200"
              style={{
                fontFamily: "var(--font-label)",
                fontSize: "11px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                backgroundColor: "var(--btn-primary)",
                color: "var(--teal-50)",
              }}
            >
              Start Course
            </button>
          </Link>
        ) : enrollStatus === "completed" ? (
          <button
            className="rounded-[5px] px-5 py-2 transition-colors duration-200"
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              backgroundColor: "#445A73",
              color: "#EEF3F8",
            }}
          >
            View Certificate
          </button>
        ) : (
          <button
            onClick={() => onEnroll?.(id)}
            className="rounded-[5px] px-5 py-2 transition-colors duration-200"
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              backgroundColor: "var(--bg-raised)",
              color: "var(--btn-primary)",
              border: "1.5px solid var(--btn-primary)",
            }}
          >
            Enroll
          </button>
        )}

        <button
          className="rounded-[5px] px-4 py-2 transition-colors duration-200 hover:bg-[var(--teal-50)]"
          style={{
            fontFamily: "var(--font-label)",
            fontSize: "11px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          Details
        </button>
      </div>
    </motion.div>
  );
}
