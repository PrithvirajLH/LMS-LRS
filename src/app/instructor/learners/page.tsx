"use client";

import { useState, useEffect } from "react";
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

export default function LearnersPage() {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "overdue" | "score" | "active">("name");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/enrollments").then((r) => r.json()),
    ])
      .then(([userData, enrollData]) => {
        const users = userData.users || [];
        const enrollments = enrollData.enrollments || [];

        // Group enrollments by userId
        const enrollmentsByUser: Record<string, Array<{ status: string; score: number; dueDate: string; completedDate: string }>> = {};
        for (const e of enrollments) {
          if (!enrollmentsByUser[e.userId]) enrollmentsByUser[e.userId] = [];
          enrollmentsByUser[e.userId].push(e);
        }

        setLearners(users.map((u: { rowKey: string; name: string; employeeId: string; facility: string; department: string; position: string; updatedAt?: string }) => {
          const userEnrollments = enrollmentsByUser[u.rowKey] || [];
          const completed = userEnrollments.filter((e: { status: string }) => e.status === "completed");
          const scores = completed.map((e: { score: number }) => e.score).filter((s: number) => s > 0);
          const overdue = userEnrollments.filter((e: { dueDate: string; status: string }) => e.dueDate && new Date(e.dueDate) < new Date() && e.status !== "completed").length;

          return {
            id: u.rowKey,
            name: u.name,
            employeeId: u.employeeId,
            facility: u.facility,
            department: u.department,
            role: u.position,
            coursesAssigned: userEnrollments.length,
            coursesCompleted: completed.length,
            overdue,
            avgScore: scores.length > 0 ? Math.round(scores.reduce((s: number, v: number) => s + v, 0) / scores.length) : 0,
            lastActive: u.updatedAt || "",
          };
        }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = learners
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

  const totalOverdue = learners.reduce((sum, l) => sum + l.overdue, 0);

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-l)", color: "var(--text-primary)" }}>
          Learners
        </h1>
        <p className="mt-2" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-body)" }}>
          {learners.length} learners across {new Set(learners.map(l => l.facility)).size} facilities
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
        Showing {filtered.length} of {learners.length} learners
      </div>
    </div>
  );
}
