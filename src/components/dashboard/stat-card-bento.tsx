"use client";

import { cn } from "@/lib/utils";

interface StatCardBentoProps {
  label: string;
  value: string | number;
  color?: "teal" | "slate" | "amber" | "dark";
  description?: string;
}

const colorMap = {
  teal: "var(--teal-400)",
  slate: "#445A73",
  amber: "var(--amber-600)",
  dark: "var(--stone-900)",
};

const bgMap = {
  teal: "var(--teal-50)",
  slate: "var(--teal-50)",
  amber: "var(--amber-50)",
  dark: "var(--stone-100)",
};

export function StatCardBento({ label, value, color = "dark", description }: StatCardBentoProps) {
  return (
    <div
      className={cn(
        "group/bento flex flex-col justify-between rounded-xl border p-6",
        "transition duration-300 hover:shadow-lg hover:shadow-black/[0.04]"
      )}
      style={{
        backgroundColor: "var(--bg-raised)",
        borderColor: "var(--border-default)",
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "var(--font-label)",
            fontSize: "11px",
            letterSpacing: "var(--tracking-widest)",
            textTransform: "uppercase" as const,
            color: "var(--text-muted)",
          }}
        >
          {label}
        </div>
        <div
          className="mt-2 transition duration-300 group-hover/bento:translate-x-1"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-stat-l)",
            fontWeight: 700,
            color: colorMap[color],
          }}
        >
          {value}
        </div>
      </div>
      {description && (
        <div
          className="mt-3 transition duration-300 group-hover/bento:translate-x-1"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "12px",
            color: "var(--text-muted)",
          }}
        >
          {description}
        </div>
      )}
      {/* Subtle accent dot */}
      <div
        className="absolute top-4 right-4 w-2 h-2 rounded-full opacity-40 group-hover/bento:opacity-100 transition-opacity duration-300"
        style={{ backgroundColor: bgMap[color] }}
      />
    </div>
  );
}
