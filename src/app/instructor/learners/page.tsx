"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { IconSearch, IconChevronDown, IconMail } from "@tabler/icons-react";

interface Learner {
  id: string;
  name: string;
  employeeId: string;
  facility: string;
  department: string;
  role: string;
  coursesAssigned: number;
  coursesCompleted: number;
  overdue: number;
  avgScore: number;
  lastActive: string;
}

const mockLearners: Learner[] = [
  { id: "1", name: "Jane Smith", employeeId: "EMP-001", facility: "Sunrise Dallas", department: "Nursing", role: "CNA", coursesAssigned: 7, coursesCompleted: 5, overdue: 1, avgScore: 92, lastActive: "2026-04-12" },
  { id: "2", name: "Bob Johnson", employeeId: "EMP-002", facility: "Sunrise Dallas", department: "Nursing", role: "RN", coursesAssigned: 6, coursesCompleted: 4, overdue: 0, avgScore: 88, lastActive: "2026-04-10" },
  { id: "3", name: "Alice Chen", employeeId: "EMP-003", facility: "Sunrise Dallas", department: "Admin", role: "Receptionist", coursesAssigned: 5, coursesCompleted: 5, overdue: 0, avgScore: 95, lastActive: "2026-04-08" },
  { id: "4", name: "Carlos Rivera", employeeId: "EMP-004", facility: "Sunrise Houston", department: "Housekeeping", role: "Housekeeper", coursesAssigned: 4, coursesCompleted: 2, overdue: 2, avgScore: 78, lastActive: "2026-03-28" },
  { id: "5", name: "Diana Foster", employeeId: "EMP-005", facility: "Sunrise Houston", department: "Dietary", role: "Dietary Aide", coursesAssigned: 5, coursesCompleted: 3, overdue: 1, avgScore: 85, lastActive: "2026-04-05" },
  { id: "6", name: "Eric Williams", employeeId: "EMP-006", facility: "Sunrise Dallas", department: "Maintenance", role: "Maintenance Tech", coursesAssigned: 3, coursesCompleted: 3, overdue: 0, avgScore: 90, lastActive: "2026-04-11" },
  { id: "7", name: "Fatima Hassan", employeeId: "EMP-007", facility: "Sunrise Austin", department: "Nursing", role: "LVN", coursesAssigned: 7, coursesCompleted: 6, overdue: 0, avgScore: 94, lastActive: "2026-04-13" },
  { id: "8", name: "Greg Martinez", employeeId: "EMP-008", facility: "Sunrise Austin", department: "Activities", role: "Activities Director", coursesAssigned: 5, coursesCompleted: 1, overdue: 3, avgScore: 72, lastActive: "2026-03-15" },
];

export default function LearnersPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "overdue" | "score" | "active">("name");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = mockLearners
    .filter((l) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return l.name.toLowerCase().includes(q) || l.employeeId.toLowerCase().includes(q) || l.facility.toLowerCase().includes(q) || l.department.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === "overdue") return b.overdue - a.overdue;
      if (sortBy === "score") return b.avgScore - a.avgScore;
      if (sortBy === "active") return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
      return a.name.localeCompare(b.name);
    });

  const totalOverdue = mockLearners.reduce((sum, l) => sum + l.overdue, 0);

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-l)", color: "var(--text-primary)" }}>
          Learners
        </h1>
        <p className="mt-2" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-body)" }}>
          {mockLearners.length} learners across {new Set(mockLearners.map(l => l.facility)).size} facilities
          {totalOverdue > 0 && <span style={{ color: "var(--amber-600)", fontWeight: 600 }}> · {totalOverdue} overdue training{totalOverdue > 1 ? "s" : ""}</span>}
        </p>
      </div>

      {/* Search + sort */}
      <div className="flex items-center gap-4 mt-6 mb-6">
        <div className="flex-1 relative">
          <IconSearch size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, employee ID, facility, or department..."
            className="w-full pl-11 pr-4 py-3 rounded-xl outline-none"
            style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-primary)", backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}
          />
        </div>
        <div className="flex items-center gap-2">
          {(["name", "overdue", "score", "active"] as const).map((s) => {
            const labels: Record<string, string> = { name: "Name", overdue: "Overdue", score: "Score", active: "Recent" };
            return (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className="rounded-full px-4 py-2 transition-colors duration-200"
                style={{
                  fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 600,
                  backgroundColor: sortBy === s ? "var(--btn-primary)" : "var(--bg-raised)",
                  color: sortBy === s ? "var(--deep-50)" : "var(--text-muted)",
                  border: sortBy === s ? "1px solid var(--btn-primary)" : "1px solid var(--border-default)",
                }}
              >
                {labels[s]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Learner list */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}>
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-6 py-3" style={{ borderBottom: "1px solid var(--border-default)", backgroundColor: "var(--bg-surface)" }}>
          {[
            { label: "Learner", span: 3 },
            { label: "Facility", span: 2 },
            { label: "Role", span: 2 },
            { label: "Progress", span: 2 },
            { label: "Score", span: 1 },
            { label: "Overdue", span: 1 },
            { label: "", span: 1 },
          ].map((h) => (
            <div key={h.label} className={`col-span-${h.span}`} style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)" }}>
              {h.label}
            </div>
          ))}
        </div>

        {/* Rows */}
        {filtered.map((learner, idx) => (
          <motion.div
            key={learner.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: idx * 0.03 }}
          >
            <div
              className="grid grid-cols-12 gap-2 px-6 py-4 items-center cursor-pointer transition-colors duration-150 hover:bg-[var(--teal-50)]"
              style={{ borderBottom: "1px solid var(--border-default)" }}
              onClick={() => setExpandedId(expandedId === learner.id ? null : learner.id)}
            >
              {/* Name */}
              <div className="col-span-3">
                <div style={{ fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{learner.name}</div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--text-muted)" }}>{learner.employeeId}</div>
              </div>

              {/* Facility */}
              <div className="col-span-2" style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-body)" }}>
                {learner.facility}
              </div>

              {/* Role */}
              <div className="col-span-2">
                <div style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-body)" }}>{learner.role}</div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--text-muted)" }}>{learner.department}</div>
              </div>

              {/* Progress */}
              <div className="col-span-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--stone-100)" }}>
                    <div className="h-full rounded-full" style={{ width: `${(learner.coursesCompleted / learner.coursesAssigned) * 100}%`, backgroundColor: "#445A73" }} />
                  </div>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>
                    {learner.coursesCompleted}/{learner.coursesAssigned}
                  </span>
                </div>
              </div>

              {/* Score */}
              <div className="col-span-1" style={{ fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: 700, color: learner.avgScore >= 80 ? "#445A73" : "var(--amber-600)" }}>
                {learner.avgScore}%
              </div>

              {/* Overdue */}
              <div className="col-span-1">
                {learner.overdue > 0 ? (
                  <span className="rounded-full px-2.5 py-0.5" style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: "var(--amber-50)", color: "var(--amber-600)" }}>
                    {learner.overdue} overdue
                  </span>
                ) : (
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>—</span>
                )}
              </div>

              {/* Expand */}
              <div className="col-span-1 flex justify-end">
                <IconChevronDown
                  size={16}
                  className="transition-transform duration-200"
                  style={{ color: "var(--text-muted)", transform: expandedId === learner.id ? "rotate(180deg)" : "none" }}
                />
              </div>
            </div>

            {/* Expanded detail */}
            {expandedId === learner.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="px-6 py-4 overflow-hidden"
                style={{ backgroundColor: "var(--bg-surface)", borderBottom: "1px solid var(--border-default)" }}
              >
                <div className="grid grid-cols-4 gap-6">
                  <div>
                    <div style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "4px" }}>Last Active</div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-primary)" }}>
                      {new Date(learner.lastActive).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "4px" }}>Courses Completed</div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-primary)" }}>
                      {learner.coursesCompleted} of {learner.coursesAssigned}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "4px" }}>Average Score</div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                      {learner.avgScore}%
                    </div>
                  </div>
                  <div className="flex items-end">
                    <button
                      className="flex items-center gap-2 rounded-[5px] px-4 py-2"
                      style={{ fontFamily: "var(--font-label)", fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: "var(--bg-raised)", color: "var(--text-muted)", border: "1px solid var(--border-default)" }}
                    >
                      <IconMail size={14} />
                      Send Reminder
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="mt-4 text-right" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
        Showing {filtered.length} of {mockLearners.length} learners
      </div>
    </div>
  );
}
