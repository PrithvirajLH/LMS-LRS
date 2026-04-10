"use client";

import { motion } from "motion/react";

interface ProgressGaugeProps {
  percentage: number;
  completed: number;
  total: number;
}

export function ProgressGauge({ percentage, completed, total }: ProgressGaugeProps) {
  const remaining = total - completed;
  // SVG arc for a semi-circle gauge
  const radius = 80;
  const circumference = Math.PI * radius;
  const filled = (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="110" viewBox="0 0 200 110">
        {/* Background arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="var(--stone-200)"
          strokeWidth="16"
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <motion.path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="var(--teal-400)"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - filled }}
          transition={{ duration: 1.2, ease: [0.2, 0, 0, 1], delay: 0.3 }}
        />
      </svg>

      {/* Percentage */}
      <div className="mt-[-8px] text-center">
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-stat-l)",
            fontWeight: 700,
            color: "var(--teal-400)",
          }}
        >
          {percentage}%
        </span>
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "14px",
            color: "var(--text-body)",
            marginTop: "2px",
          }}
        >
          of goal
        </div>
      </div>

      {/* Description */}
      <p
        className="mt-3 text-center max-w-[200px]"
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "13px",
          color: "var(--text-muted)",
          lineHeight: "var(--leading-relaxed)",
        }}
      >
        You&apos;ve completed{" "}
        <strong style={{ color: "var(--text-primary)", fontWeight: 700 }}>{completed}</strong> of your{" "}
        <strong style={{ color: "var(--text-primary)", fontWeight: 700 }}>{total}</strong> courses
        needed for compliance.
        {remaining > 0 && (
          <> Only <strong style={{ color: "var(--teal-400)", fontWeight: 700 }}>{remaining}</strong> to go!</>
        )}
      </p>
    </div>
  );
}
