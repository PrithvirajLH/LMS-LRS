"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { IconArrowLeft, IconMaximize, IconMinimize } from "@tabler/icons-react";

interface CoursePlayerHeaderProps {
  title: string;
  category: string;
  progress: number;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
}

export function CoursePlayerHeader({
  title,
  category,
  progress,
  onToggleFullscreen,
  isFullscreen,
}: CoursePlayerHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-between px-6 h-14 shrink-0"
      style={{
        backgroundColor: "var(--bg-obsidian, var(--bg-dark))",
        borderBottom: "1px solid rgba(100,122,147,0.15)",
      }}
    >
      {/* Left: back + title */}
      <div className="flex items-center gap-4">
        <Link
          href="/learn"
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors duration-200 hover:bg-white/[0.06]"
        >
          <IconArrowLeft size={16} style={{ color: "var(--text-on-dark-muted, var(--stone-400))" }} />
          <span
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "10px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--text-on-dark-muted, var(--stone-400))",
            }}
          >
            Back
          </span>
        </Link>

        <div className="h-5 w-px" style={{ backgroundColor: "rgba(100,122,147,0.2)" }} />

        <div>
          <span
            style={{
              fontFamily: "var(--font-label)",
              fontSize: "9px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--text-on-dark-muted, var(--deep-200, var(--stone-400)))",
            }}
          >
            {category}
          </span>
          <h1
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "14px",
              fontWeight: 700,
              color: "var(--text-on-dark, var(--teal-50))",
              lineHeight: 1.2,
            }}
          >
            {title}
          </h1>
        </div>
      </div>

      {/* Right: progress + fullscreen */}
      <div className="flex items-center gap-5">
        {/* Progress */}
        <div className="flex items-center gap-3">
          <div
            className="w-32 h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: "rgba(100,122,147,0.2)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: "var(--teal-400)" }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: [0.2, 0, 0, 1] }}
            />
          </div>
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text-on-dark, var(--teal-100))",
            }}
          >
            {progress}%
          </span>
        </div>

        {/* Fullscreen toggle */}
        <button
          onClick={onToggleFullscreen}
          className="rounded-lg p-2 transition-colors duration-200 hover:bg-white/[0.06]"
        >
          {isFullscreen ? (
            <IconMinimize size={16} style={{ color: "var(--text-on-dark-muted, var(--stone-400))" }} />
          ) : (
            <IconMaximize size={16} style={{ color: "var(--text-on-dark-muted, var(--stone-400))" }} />
          )}
        </button>
      </div>
    </motion.header>
  );
}
