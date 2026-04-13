"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { IconSearch, IconChevronDown, IconMail, IconKey, IconShield, IconUserOff, IconUserCheck, IconLoader2, IconCheck } from "@tabler/icons-react";

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
  status?: string;
}

export default function LearnersPage() {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "overdue" | "score" | "active">("name");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [resetModal, setResetModal] = useState<{ learner: Learner } | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/enrollments").then((r) => r.json()),
    ])
      .then(([userData, enrollData]) => {
        const users = userData.users || [];
        const enrollments = enrollData.enrollments || [];

        const enrollmentsByUser: Record<string, Array<{ status: string; score: number; dueDate: string }>> = {};
        for (const e of enrollments) {
          if (!enrollmentsByUser[e.userId]) enrollmentsByUser[e.userId] = [];
          enrollmentsByUser[e.userId].push(e);
        }

        setLearners(users.map((u: { rowKey: string; name: string; employeeId: string; facility: string; department: string; position: string; role?: string; status?: string; updatedAt?: string }) => {
          const userEnrollments = enrollmentsByUser[u.rowKey] || [];
          const completed = userEnrollments.filter((e) => e.status === "completed");
          const scores = completed.map((e) => e.score).filter((s) => s > 0);
          const overdue = userEnrollments.filter((e) => e.dueDate && new Date(e.dueDate) < new Date() && e.status !== "completed").length;

          return {
            id: u.rowKey,
            name: u.name,
            employeeId: u.employeeId,
            facility: u.facility,
            department: u.department,
            role: u.role || "learner",
            status: u.status || "active",
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

  useEffect(() => { loadData(); }, [loadData]);

  function openResetModal(learner: Learner) {
    setResetPassword("");
    setResetSuccess(false);
    setResetModal({ learner });
  }

  async function handleResetPassword() {
    if (!resetModal || resetPassword.length < 6) return;
    setActionLoading(resetModal.learner.id + "-pw");
    await fetch("/api/admin/users/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: resetModal.learner.id, newPassword: resetPassword }) });
    setActionLoading(null);
    setResetSuccess(true);
    setTimeout(() => { setResetModal(null); setResetSuccess(false); }, 1500);
  }

  async function handleRoleChange(learner: Learner, newRole: string) {
    setActionLoading(learner.id + "-role");
    await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: learner.id, role: newRole }) });
    setActionLoading(null);
    loadData();
  }

  async function handleStatusToggle(learner: Learner) {
    const newStatus = learner.status === "active" ? "inactive" : "active";
    setActionLoading(learner.id + "-status");
    await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: learner.id, status: newStatus }) });
    setActionLoading(null);
    loadData();
  }

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

  if (loading) {
    return (
      <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded" style={{ backgroundColor: "var(--bg-surface)" }} />
          <div className="h-64 rounded-2xl" style={{ backgroundColor: "var(--bg-surface)" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-l)", color: "var(--text-primary)" }}>
          Learner Management
        </h1>
        <p className="mt-2" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-body)" }}>
          {learners.length} users across {new Set(learners.map(l => l.facility)).size} facilities
          {totalOverdue > 0 && <span style={{ color: "var(--amber-600)", fontWeight: 600 }}> · {totalOverdue} overdue</span>}
        </p>
      </div>

      {/* Search + sort */}
      <div className="flex items-center gap-4 mt-6 mb-6">
        <div className="flex-1 relative">
          <IconSearch size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, employee ID, facility, or department..."
            className="w-full pl-11 pr-4 py-3 rounded-xl outline-none"
            style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-primary)", backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }} />
        </div>
        <div className="flex items-center gap-2">
          {(["name", "overdue", "score", "active"] as const).map((s) => {
            const labels: Record<string, string> = { name: "Name", overdue: "Overdue", score: "Score", active: "Recent" };
            return (
              <button key={s} onClick={() => setSortBy(s)} className="rounded-full px-4 py-2 transition-colors duration-200"
                style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 600, backgroundColor: sortBy === s ? "var(--btn-primary)" : "var(--bg-raised)", color: sortBy === s ? "var(--deep-50)" : "var(--text-muted)", border: sortBy === s ? "1px solid var(--btn-primary)" : "1px solid var(--border-default)" }}>
                {labels[s]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Learner cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-muted)" }}>
              {learners.length === 0 ? "No learners registered yet." : "No learners match your search."}
            </p>
          </div>
        ) : filtered.map((learner, idx) => (
          <motion.div
            key={learner.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className="rounded-2xl"
            style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}
          >
            {/* Main row */}
            <div
              className="flex items-center gap-5 px-6 py-4 cursor-pointer transition-colors duration-150 hover:bg-[var(--teal-50)]"
              onClick={() => setExpandedId(expandedId === learner.id ? null : learner.id)}
            >
              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: learner.status === "inactive" ? "var(--stone-200)" : "var(--teal-100)",
                  color: learner.status === "inactive" ? "var(--text-muted)" : "var(--teal-600)",
                  fontFamily: "var(--font-label)", fontSize: "13px", letterSpacing: "0.04em",
                }}
              >
                {learner.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: 700, color: learner.status === "inactive" ? "var(--text-muted)" : "var(--text-primary)" }}>
                    {learner.name}
                  </span>
                  {learner.status === "inactive" && (
                    <span className="rounded-full px-2 py-0.5" style={{ fontFamily: "var(--font-label)", fontSize: "8px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: "var(--stone-100)", color: "var(--text-muted)" }}>
                      Inactive
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>{learner.employeeId}</span>
                  <span style={{ color: "var(--border-default)" }}>·</span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>{learner.facility}</span>
                  {learner.department && (
                    <>
                      <span style={{ color: "var(--border-default)" }}>·</span>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>{learner.department}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="w-28 shrink-0">
                {learner.coursesAssigned > 0 ? (
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--stone-100)" }}>
                        <div className="h-full rounded-full" style={{ width: `${learner.coursesAssigned > 0 ? (learner.coursesCompleted / learner.coursesAssigned) * 100 : 0}%`, backgroundColor: "#445A73" }} />
                      </div>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 700, color: "var(--text-primary)" }}>
                        {learner.coursesCompleted}/{learner.coursesAssigned}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>No courses</span>
                )}
              </div>

              {/* Score */}
              <div className="w-14 shrink-0 text-center">
                {learner.avgScore > 0 ? (
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: 700, color: learner.avgScore >= 80 ? "#445A73" : "var(--amber-600)" }}>
                    {learner.avgScore}%
                  </span>
                ) : (
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>—</span>
                )}
              </div>

              {/* Overdue badge */}
              <div className="w-20 shrink-0">
                {learner.overdue > 0 ? (
                  <span className="rounded-full px-2.5 py-1" style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", backgroundColor: "var(--amber-50)", color: "var(--amber-600)" }}>
                    {learner.overdue} overdue
                  </span>
                ) : (
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>On track</span>
                )}
              </div>

              {/* Chevron */}
              <IconChevronDown size={16} className="shrink-0 transition-transform duration-200" style={{ color: "var(--text-muted)", transform: expandedId === learner.id ? "rotate(180deg)" : "none" }} />
            </div>

            {/* Expanded panel */}
            <AnimatePresence>
              {expandedId === learner.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-6 py-5" style={{ backgroundColor: "var(--bg-surface)", borderTop: "1px solid var(--border-default)" }}>
                    {/* Stats row */}
                    <div className="grid grid-cols-4 gap-4 mb-5">
                      {[
                        { label: "Last Active", value: learner.lastActive ? new Date(learner.lastActive).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never" },
                        { label: "Courses", value: `${learner.coursesCompleted} / ${learner.coursesAssigned} completed` },
                        { label: "Avg Score", value: learner.avgScore > 0 ? `${learner.avgScore}%` : "No scores" },
                        { label: "Position", value: learner.role || "—" },
                      ].map((stat) => (
                        <div key={stat.label}>
                          <div style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "4px" }}>{stat.label}</div>
                          <div style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-primary)" }}>{stat.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Admin actions */}
                    <div className="pt-4 flex items-center gap-3 flex-wrap" style={{ borderTop: "1px solid var(--border-default)" }}>
                      <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)", marginRight: "8px" }}>Actions</span>

                      {/* Role selector — custom dropdown */}
                      <RoleDropdown
                        currentRole={learner.role || "learner"}
                        loading={actionLoading === learner.id + "-role"}
                        onChange={(newRole) => handleRoleChange(learner, newRole)}
                      />

                      {/* Reset password */}
                      <button
                        onClick={() => openResetModal(learner)}
                        disabled={actionLoading === learner.id + "-pw"}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-2 transition-colors duration-200 hover:bg-[var(--teal-50)]"
                        style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-body)", backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}
                      >
                        <IconKey size={14} />
                        Reset Password
                        {actionLoading === learner.id + "-pw" && <IconLoader2 size={12} className="animate-spin" />}
                      </button>

                      {/* Send reminder */}
                      <button
                        className="flex items-center gap-1.5 rounded-lg px-3 py-2 transition-colors duration-200 hover:bg-[var(--teal-50)]"
                        style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-body)", backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}
                      >
                        <IconMail size={14} />
                        Send Reminder
                      </button>

                      {/* Activate / Deactivate */}
                      <button
                        onClick={() => handleStatusToggle(learner)}
                        disabled={actionLoading === learner.id + "-status"}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-2 transition-colors duration-200 ml-auto"
                        style={{
                          fontFamily: "var(--font-body)", fontSize: "13px",
                          color: learner.status === "active" ? "var(--amber-600)" : "#3A6A5A",
                          backgroundColor: learner.status === "active" ? "var(--amber-50)" : "#E8F0E8",
                          border: learner.status === "active" ? "1px solid var(--amber-200)" : "1px solid #B8D8B8",
                        }}
                      >
                        {learner.status === "active" ? <IconUserOff size={14} /> : <IconUserCheck size={14} />}
                        {learner.status === "active" ? "Deactivate" : "Activate"}
                        {actionLoading === learner.id + "-status" && <IconLoader2 size={12} className="animate-spin" />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 text-right" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
        Showing {filtered.length} of {learners.length} users
      </div>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {resetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => setResetModal(null)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0" style={{ backgroundColor: "rgba(10,22,40,0.5)", backdropFilter: "blur(4px)" }} />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
              className="relative w-full max-w-[420px] rounded-2xl p-8"
              style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {resetSuccess ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: "#E8F0E8" }}>
                    <IconKey size={24} style={{ color: "#3A6A5A" }} />
                  </div>
                  <h3 style={{ fontFamily: "var(--font-body)", fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>Password Reset</h3>
                  <p className="mt-1" style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-muted)" }}>
                    Password updated for {resetModal.learner.name}
                  </p>
                </div>
              ) : (
                <>
                  <h3 style={{ fontFamily: "var(--font-body)", fontSize: "17px", fontWeight: 700, color: "var(--text-primary)" }}>
                    Reset Password
                  </h3>
                  <p className="mt-1 mb-5" style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-muted)" }}>
                    Set a new password for <strong style={{ color: "var(--text-primary)" }}>{resetModal.learner.name}</strong>
                  </p>

                  <div className="mb-5">
                    <label style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-body)", display: "block", marginBottom: "6px" }}>
                      New Password
                    </label>
                    <input
                      type="password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      autoFocus
                      className="w-full rounded-lg px-4 py-3 outline-none"
                      style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-primary)", backgroundColor: "var(--bg-page)", border: "1px solid var(--border-default)" }}
                      onKeyDown={(e) => { if (e.key === "Enter" && resetPassword.length >= 6) handleResetPassword(); }}
                    />
                    {resetPassword.length > 0 && resetPassword.length < 6 && (
                      <p className="mt-1.5" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--amber-600)" }}>
                        Password must be at least 6 characters
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleResetPassword}
                      disabled={resetPassword.length < 6 || actionLoading === resetModal.learner.id + "-pw"}
                      className="flex items-center gap-2 rounded-[5px] px-5 py-2.5 disabled:opacity-50"
                      style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: "var(--btn-primary)", color: "var(--teal-50)" }}
                    >
                      {actionLoading === resetModal.learner.id + "-pw" ? <IconLoader2 size={14} className="animate-spin" /> : <IconKey size={14} />}
                      Reset Password
                    </button>
                    <button
                      onClick={() => setResetModal(null)}
                      className="rounded-[5px] px-5 py-2.5"
                      style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", border: "1px solid var(--border-default)" }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Custom Role Dropdown ────────────────────────────────────── */

function RoleDropdown({ currentRole, loading, onChange }: { currentRole: string; loading: boolean; onChange: (role: string) => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function toggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(!open);
  }

  const roles = ["learner", "instructor", "admin"];
  const label = currentRole.charAt(0).toUpperCase() + currentRole.slice(1);

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors duration-200 hover:bg-[var(--teal-50)]"
        style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-body)", backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}
      >
        <IconShield size={14} style={{ color: "var(--text-muted)" }} />
        {loading ? <IconLoader2 size={14} className="animate-spin" /> : label}
        <IconChevronDown size={14} style={{ color: "var(--text-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
            className="fixed z-[9999] rounded-xl py-1 min-w-[160px]"
            style={{ top: pos.top, left: pos.left, backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)", boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}
          >
            {roles.map((r) => {
              const isActive = currentRole === r;
              return (
                <button
                  key={r}
                  onClick={() => { if (!isActive) onChange(r); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-[var(--teal-50)]"
                  style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: isActive ? "var(--text-primary)" : "var(--text-body)", fontWeight: isActive ? 600 : 400 }}
                >
                  <span className="flex-1">{r.charAt(0).toUpperCase() + r.slice(1)}</span>
                  {isActive && <IconCheck size={14} style={{ color: "var(--teal-400)" }} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
