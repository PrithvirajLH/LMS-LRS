"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";

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

        {/* Sort — custom dropdown */}
        <SortDropdown value={sortBy} onChange={onSortChange} />
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
                fontFamily: "var(--font-body)",
                fontSize: "12px",
                fontWeight: 600,
                backgroundColor: active ? "var(--btn-primary)" : "var(--bg-raised)",
                color: active ? "var(--deep-50)" : "var(--text-muted)",
                border: active ? "1px solid var(--btn-primary)" : "1px solid var(--border-default)",
              }}
            >
              {active && (
                <motion.div
                  layoutId="activeFilter"
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: "var(--btn-primary)" }}
                  transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                />
              )}
              <span className="relative z-10">
                {filter.label}
                <span
                  className="ml-2"
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

const sortOptions = [
  { value: "due_date", label: "Due Date" },
  { value: "name", label: "Name" },
  { value: "progress", label: "Progress" },
  { value: "category", label: "Category" },
];

function SortDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = sortOptions.find((o) => o.value === value);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg pl-4 pr-3 py-3 transition-all duration-200"
        style={{
          backgroundColor: "var(--bg-raised)",
          border: open ? "1px solid var(--teal-400)" : "1px solid var(--border-default)",
          minWidth: "160px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--text-primary)",
            flex: 1,
            textAlign: "left",
          }}
        >
          {selected?.label}
        </span>
        <motion.svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <path d="m6 9 6 6 6-6" />
        </motion.svg>
      </button>

      {/* Floating label */}
      <div
        className="absolute -top-2 left-3 px-1"
        style={{
          fontFamily: "var(--font-label)",
          fontSize: "9px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          backgroundColor: "var(--bg-raised)",
        }}
      >
        Sort by
      </div>

      {/* Dropdown menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
            className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-50 shadow-lg shadow-black/[0.08]"
            style={{
              backgroundColor: "var(--bg-raised)",
              border: "1px solid var(--border-default)",
            }}
          >
            {sortOptions.filter((option) => option.value !== value).map((option) => {
              const isActive = option.value === value;
              return (
                <button
                  key={option.value}
                  onClick={() => { onChange(option.value); setOpen(false); }}
                  className="w-full text-left px-4 py-2.5 transition-colors duration-150"
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "13px",
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "var(--teal-600)" : "var(--text-body)",
                    backgroundColor: isActive ? "var(--teal-50)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.target as HTMLElement).style.backgroundColor = "var(--teal-50)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.target as HTMLElement).style.backgroundColor = "transparent";
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
