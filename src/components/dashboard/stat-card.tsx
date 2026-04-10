"use client";

interface StatCardProps {
  label: string;
  value: string | number;
  color?: "teal" | "slate" | "amber" | "dark";
}

const colorMap = {
  teal: "var(--teal-400)",
  slate: "var(--slate-400)",
  amber: "var(--amber-600)",
  dark: "var(--stone-900)",
};

export function StatCard({ label, value, color = "dark" }: StatCardProps) {
  return (
    <div
      className="rounded-xl px-6 py-5"
      style={{ backgroundColor: "var(--bg-surface)" }}
    >
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
        className="mt-1"
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
  );
}
