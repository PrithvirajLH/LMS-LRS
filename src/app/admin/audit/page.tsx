"use client";

import { useEffect, useState, useCallback } from "react";

// ── Types ──

interface AuditEntry {
  action: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  targetType: string;
  targetId: string;
  summary: string;
  details: string;
  timestamp: string;
  ip: string;
}

// ── Action category config ──

const ACTION_CATEGORIES: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  "user.create":          { label: "User Created",       color: "text-emerald-700", bg: "bg-emerald-50",  icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" },
  "user.role_change":     { label: "Role Changed",       color: "text-amber-700",   bg: "bg-amber-50",    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  "user.status_change":   { label: "Status Changed",     color: "text-orange-700",  bg: "bg-orange-50",   icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" },
  "user.password_reset":  { label: "Password Reset",     color: "text-red-600",     bg: "bg-red-50",      icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
  "enrollment.create":    { label: "Enrollment",         color: "text-blue-700",    bg: "bg-blue-50",     icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  "enrollment.bulk_create": { label: "Bulk Enrollment",  color: "text-blue-700",    bg: "bg-blue-50",     icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  "course.create":        { label: "Course Created",     color: "text-violet-700",  bg: "bg-violet-50",   icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  "course.upload":        { label: "Course Uploaded",    color: "text-violet-700",  bg: "bg-violet-50",   icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" },
  "course.publish":       { label: "Course Published",   color: "text-green-700",   bg: "bg-green-50",    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  "course.update":        { label: "Course Updated",     color: "text-slate-600",   bg: "bg-slate-50",    icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
  "credential.create":    { label: "Credential Created", color: "text-teal-700",    bg: "bg-teal-50",     icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" },
  "credential.activate":  { label: "Credential On",      color: "text-green-600",   bg: "bg-green-50",    icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  "credential.deactivate":{ label: "Credential Off",     color: "text-red-600",     bg: "bg-red-50",      icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" },
};

const FALLBACK_ACTION = { label: "Action", color: "text-gray-600", bg: "bg-gray-50", icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" };

function getActionConfig(action: string) {
  return ACTION_CATEGORIES[action] || FALLBACK_ACTION;
}

// ── Helpers ──

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function roleBadge(role: string) {
  const styles: Record<string, string> = {
    admin: "bg-red-100 text-red-700 border-red-200",
    instructor: "bg-amber-100 text-amber-700 border-amber-200",
    learner: "bg-blue-100 text-blue-700 border-blue-200",
  };
  return styles[role] || "bg-gray-100 text-gray-600 border-gray-200";
}

// ── All unique actions for the filter dropdown ──
const ALL_ACTIONS = Object.keys(ACTION_CATEGORIES);

// ── Component ──

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState("");
  const [months, setMonths] = useState(1);

  const loadAudit = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", "100");
    params.set("months", String(months));
    if (actionFilter) params.set("action", actionFilter);

    try {
      const res = await fetch(`/api/admin/audit?${params}`);
      const data = await res.json();
      setEntries(data.entries || []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, months]);

  useEffect(() => { loadAudit(); }, [loadAudit]);

  // Group entries by date
  const grouped: Record<string, AuditEntry[]> = {};
  for (const entry of entries) {
    const date = new Date(entry.timestamp).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(entry);
  }

  return (
    <div className="p-8 max-w-[1100px]">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-bold"
          style={{ color: "#0A1628" }}
        >
          Audit Log
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Immutable record of every administrative action
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex items-end gap-4 flex-wrap">
          {/* Action type */}
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest block mb-1.5">
              Action Type
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none min-w-[200px]"
            >
              <option value="">All actions</option>
              {ALL_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {ACTION_CATEGORIES[a].label}
                </option>
              ))}
            </select>
          </div>

          {/* Time range */}
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest block mb-1.5">
              Time Range
            </label>
            <select
              value={months}
              onChange={(e) => setMonths(parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value={1}>Last month</option>
              <option value={3}>Last 3 months</option>
              <option value={6}>Last 6 months</option>
              <option value={12}>Last year</option>
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={loadAudit}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{
              backgroundColor: loading ? "#E7F0F7" : "#0A1628",
              color: loading ? "#647A93" : "#EAF0F6",
            }}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>

          {/* Count */}
          <div className="ml-auto text-xs text-gray-400 self-center">
            {entries.length} event{entries.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 mt-3">Loading audit entries...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm text-gray-400">No audit entries found</p>
          <p className="text-xs text-gray-300 mt-1">Actions will appear here as admins make changes</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dayEntries]) => (
            <div key={date}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "#647A93" }}
                >
                  {date}
                </div>
                <div className="flex-1 h-px bg-gray-200" />
                <div className="text-[10px] text-gray-400">
                  {dayEntries.length} event{dayEntries.length !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Day entries */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                {dayEntries.map((entry, idx) => {
                  const globalIdx = entries.indexOf(entry);
                  const config = getActionConfig(entry.action);
                  const isExpanded = expandedIdx === globalIdx;
                  let parsedDetails: Record<string, unknown> | null = null;
                  try {
                    parsedDetails = JSON.parse(entry.details);
                    if (parsedDetails && Object.keys(parsedDetails).length === 0) parsedDetails = null;
                  } catch { /* skip */ }

                  return (
                    <div key={idx}>
                      <button
                        onClick={() => setExpandedIdx(isExpanded ? null : globalIdx)}
                        className="w-full text-left px-5 py-3.5 hover:bg-gray-50/70 transition-colors flex items-start gap-4 group"
                      >
                        {/* Icon */}
                        <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                          <svg className={`w-4 h-4 ${config.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={config.icon} />
                          </svg>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Summary line */}
                          <div className="text-[13px] leading-relaxed text-gray-800">
                            {entry.summary}
                          </div>

                          {/* Meta line */}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {/* Action badge */}
                            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${config.bg} ${config.color}`}
                              style={{ borderColor: "transparent" }}
                            >
                              {config.label}
                            </span>

                            {/* Actor */}
                            <span className="text-[11px] text-gray-500">
                              by <span className="font-medium text-gray-700">{entry.actorName}</span>
                            </span>

                            {/* Role badge */}
                            <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-px rounded border ${roleBadge(entry.actorRole)}`}>
                              {entry.actorRole}
                            </span>

                            {/* Spacer + time */}
                            <span className="text-[11px] text-gray-400 ml-auto shrink-0">
                              {timeAgo(entry.timestamp)}
                            </span>
                          </div>
                        </div>

                        {/* Expand chevron */}
                        <svg
                          className={`w-4 h-4 text-gray-300 mt-1 shrink-0 transition-transform group-hover:text-gray-400 ${isExpanded ? "rotate-180" : ""}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="px-5 pb-4 bg-gray-50/50 border-t border-gray-100">
                          <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[12px]">
                            <span className="text-gray-400 font-medium">Timestamp</span>
                            <span className="text-gray-700 font-mono">{formatTimestamp(entry.timestamp)}</span>

                            <span className="text-gray-400 font-medium">Action</span>
                            <span className="text-gray-700 font-mono">{entry.action}</span>

                            <span className="text-gray-400 font-medium">Actor</span>
                            <span className="text-gray-700">
                              {entry.actorName} <span className="text-gray-400">({entry.actorId})</span>
                            </span>

                            <span className="text-gray-400 font-medium">Target</span>
                            <span className="text-gray-700">
                              <span className="text-gray-400">{entry.targetType}/</span>{entry.targetId}
                            </span>

                            {entry.ip && (
                              <>
                                <span className="text-gray-400 font-medium">IP Address</span>
                                <span className="text-gray-700 font-mono">{entry.ip}</span>
                              </>
                            )}
                          </div>

                          {parsedDetails && (
                            <div className="mt-3">
                              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                                Details
                              </div>
                              <pre className="text-[11px] text-gray-600 overflow-auto max-h-48 p-3 bg-white rounded-lg border border-gray-200 font-mono leading-relaxed">
                                {JSON.stringify(parsedDetails, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
