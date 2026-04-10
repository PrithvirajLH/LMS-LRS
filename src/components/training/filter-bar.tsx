"use client";

import { motion } from "motion/react";

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  activeFilter: string;
  onFilterChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  filters: Array<{ label: string; value: string; count: number }>;
}

export function FilterBar({
  search,
  onSearchChange,
  activeFilter,
  onFilterChange,
  sortBy,
  onSortChange,
  filters,
}: FilterBarProps) {
  return (
    <div className="mb-8">
      {/* Search + Sort row */}
      <div className="flex items-center gap-4 mb-5">
        {/* Search */}
        <div className="flex-1 relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--stone-400)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search courses..."
            className="w-full pl-11 pr-4 py-3 rounded-xl outline-none transition-all duration-200"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "14px",
              color: "var(--text-primary)",
              backgroundColor: "var(--bg-raised)",
              border: "1px solid var(--border-default)",
            }}
          />
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="rounded-xl px-4 py-3 outline-none cursor-pointer transition-all duration-200"
          style={{
            fontFamily: "var(--font-label)",
            fontSize: "11px",
            letterSpacing: "var(--tracking-wide)",
            textTransform: "uppercase" as const,
            color: "var(--text-body)",
            backgroundColor: "var(--bg-raised)",
            border: "1px solid var(--border-default)",
          }}
        >
          <option value="due_date">Due Date</option>
          <option value="name">Name</option>
          <option value="progress">Progress</option>
          <option value="category">Category</option>
        </select>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2">
        {filters.map((filter) => {
          const active = activeFilter === filter.value;
          return (
            <button
              key={filter.value}
              onClick={() => onFilterChange(filter.value)}
              className="relative rounded-full px-4 py-2 transition-colors duration-200"
              style={{
                fontFamily: "var(--font-label)",
                fontSize: "11px",
                letterSpacing: "var(--tracking-wide)",
                textTransform: "uppercase" as const,
                backgroundColor: active ? "var(--teal-400)" : "var(--bg-raised)",
                color: active ? "var(--teal-50)" : "var(--text-body)",
                border: active ? "1px solid var(--teal-400)" : "1px solid var(--border-default)",
              }}
            >
              {active && (
                <motion.div
                  layoutId="activeFilter"
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: "var(--teal-400)" }}
                  transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                />
              )}
              <span className="relative z-10">
                {filter.label}
                <span
                  className="ml-1.5 opacity-60"
                  style={{ fontFamily: "var(--font-body)", fontWeight: 700 }}
                >
                  {filter.count}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
