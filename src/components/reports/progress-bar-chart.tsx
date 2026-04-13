"use client";

import { motion } from "motion/react";

interface ProgressBarChartProps {
  data: Array<{ label: string; value: number; max: number; color?: string }>;
}

export function ProgressBarChart({ data }: ProgressBarChartProps) {
  const maxVal = Math.max(...data.map((d) => d.max));

  return (
    <div className="space-y-3">
      {data.map((item, idx) => (
        <div key={item.label} className="flex items-center gap-4">
          <span
            className="w-28 shrink-0 text-right"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "12px",
              color: "var(--text-muted)",
            }}
          >
            {item.label}
          </span>
          <div className="flex-1 h-6 rounded-md overflow-hidden relative" style={{ backgroundColor: "var(--stone-100)" }}>
            <motion.div
              className="h-full rounded-md"
              style={{ backgroundColor: item.color || "var(--teal-400)" }}
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / maxVal) * 100}%` }}
              transition={{ duration: 0.6, delay: idx * 0.08, ease: [0.2, 0, 0, 1] }}
            />
            <span
              className="absolute right-2 top-1/2 -translate-y-1/2"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "11px",
                fontWeight: 700,
                color: item.value / maxVal > 0.5 ? "#EEF3F8" : "var(--text-muted)",
              }}
            >
              {item.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
