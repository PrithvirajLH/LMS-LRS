"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { IconDownload, IconFilter, IconChevronDown, IconCalendar, IconRefresh } from "@tabler/icons-react";

interface LearnerReport {
  userName: string;
  email: string;
  employeeId: string;
  provider: string;
  estDuration: number;
  actualTimeSpent: number;
  durationFinal: number;
  coursesAssigned: number;
  coursesCompleted: number;
  completedOnTime: number;
  assignedDate: string;
  dueDate: string;
  completedDate: string;
  completePercent: number;
  compliantPercent: number;
  userStatus: string;
  registrationStep: string;
  tags: string[];
}

const mockReport: LearnerReport[] = [
  { userName: "Amanda Jordan", email: "amandajordn@gmail.com", employeeId: "083344", provider: "Arlington Heights Health And Rehabilitation Center", estDuration: 121, actualTimeSpent: 126, durationFinal: 108, coursesAssigned: 12, coursesCompleted: 12, completedOnTime: 12, assignedDate: "2025-12-01", dueDate: "2025-12-15", completedDate: "2025-12-04", completePercent: 100, compliantPercent: 100, userStatus: "active", registrationStep: "complete", tags: ["department-therapy", "position-speech-and-language-therapist"] },
  { userName: "Ana Armendariz", email: "anamarmendariz@icloud.com", employeeId: "102646", provider: "Arlington Heights Health And Rehabilitation Center", estDuration: 121, actualTimeSpent: 68086, durationFinal: 121, coursesAssigned: 11, coursesCompleted: 11, completedOnTime: 0, assignedDate: "2025-04-25", dueDate: "2025-09-17", completedDate: "2025-12-29", completePercent: 100, compliantPercent: 0, userStatus: "active", registrationStep: "complete", tags: ["department-housekeeping", "position-housekeeping-staff"] },
  { userName: "Abiodun Fadahunsi", email: "fadahunssiabiodun@gmail.com", employeeId: "074812", provider: "Arlington Heights Health And Rehabilitation Center", estDuration: 112, actualTimeSpent: 42938, durationFinal: 107, coursesAssigned: 11, coursesCompleted: 11, completedOnTime: 0, assignedDate: "2025-09-01", dueDate: "2025-09-16", completedDate: "2025-10-18", completePercent: 100, compliantPercent: 0, userStatus: "active", registrationStep: "complete", tags: ["department-nursing-direct-care", "position-charge-nurse-rn"] },
  { userName: "Adeola Ojo", email: "deolaojo2001@yahoo.com", employeeId: "091523", provider: "Arlington Heights Health And Rehabilitation Center", estDuration: 121, actualTimeSpent: 1477, durationFinal: 119, coursesAssigned: 12, coursesCompleted: 12, completedOnTime: 12, assignedDate: "2026-04-07", dueDate: "2026-04-21", completedDate: "2026-04-08", completePercent: 100, compliantPercent: 100, userStatus: "active", registrationStep: "complete", tags: ["department-nursing-direct-care", "position-charge-nurse-rn"] },
  { userName: "Adrian Lewis", email: "denise.39.lewis@gmail.com", employeeId: "105686", provider: "Arlington Heights Health And Rehabilitation Center", estDuration: 121, actualTimeSpent: 1995, durationFinal: 121, coursesAssigned: 11, coursesCompleted: 11, completedOnTime: 0, assignedDate: "2025-07-18", dueDate: "2025-09-17", completedDate: "2025-12-31", completePercent: 100, compliantPercent: 0, userStatus: "active", registrationStep: "complete", tags: ["department-laundry", "position-laundry-staff"] },
  { userName: "Adrianna Gonzales", email: "adrianna51893@gmail.com", employeeId: "096625", provider: "Arlington Heights Health And Rehabilitation Center", estDuration: 121, actualTimeSpent: 324, durationFinal: 116, coursesAssigned: 12, coursesCompleted: 12, completedOnTime: 0, assignedDate: "2025-04-16", dueDate: "2025-09-16", completedDate: "2025-10-02", completePercent: 100, compliantPercent: 0, userStatus: "active", registrationStep: "complete", tags: ["department-housekeeping", "position-housekeeping-staff"] },
  { userName: "Alexus Gilbert", email: "ascalia96@yahoo.com", employeeId: "111801", provider: "Arlington Heights Health And Rehabilitation Center", estDuration: 121, actualTimeSpent: 1199, durationFinal: 100, coursesAssigned: 12, coursesCompleted: 12, completedOnTime: 12, assignedDate: "2026-01-28", dueDate: "2026-02-11", completedDate: "2026-02-10", completePercent: 100, compliantPercent: 100, userStatus: "active", registrationStep: "complete", tags: ["department-therapy", "position-speech-and-language-therapist"] },
  { userName: "Allencia Potter-Spence", email: "lenlen92@aol.com", employeeId: "058666", provider: "Arlington Heights Health And Rehabilitation Center", estDuration: 121, actualTimeSpent: 1696, durationFinal: 115, coursesAssigned: 12, coursesCompleted: 12, completedOnTime: 0, assignedDate: "2025-11-23", dueDate: "2025-12-07", completedDate: "2025-12-29", completePercent: 100, compliantPercent: 0, userStatus: "active", registrationStep: "complete", tags: ["department-nursing-direct-care", "position-charge-nurse-rn"] },
  { userName: "Ana Lopez", email: "analopez1123@icloud.com", employeeId: "112848", provider: "Arlington Heights Health And Rehabilitation Center", estDuration: 121, actualTimeSpent: 204, durationFinal: 61, coursesAssigned: 12, coursesCompleted: 12, completedOnTime: 12, assignedDate: "2026-03-05", dueDate: "2026-03-19", completedDate: "2026-03-05", completePercent: 100, compliantPercent: 100, userStatus: "active", registrationStep: "complete", tags: ["department-dietary", "position-dietary-cooks"] },
  { userName: "Angelica Iniguez", email: "anguelicainiguez72@gmail.com", employeeId: "074062", provider: "Arlington Heights Health And Rehabilitation Center", estDuration: 112, actualTimeSpent: 225, durationFinal: 110, coursesAssigned: 11, coursesCompleted: 11, completedOnTime: 0, assignedDate: "2025-09-01", dueDate: "2025-09-16", completedDate: "2025-12-23", completePercent: 100, compliantPercent: 0, userStatus: "active", registrationStep: "complete", tags: ["department-dietary", "position-dietary-staff"] },
  { userName: "Angelique Harris", email: "angeliqueharris05@gmail.com", employeeId: "093664", provider: "Arlington Heights Health And Rehabilitation Center", estDuration: 112, actualTimeSpent: 398, durationFinal: 108, coursesAssigned: 11, coursesCompleted: 11, completedOnTime: 0, assignedDate: "2025-09-01", dueDate: "2025-09-16", completedDate: "2025-11-11", completePercent: 100, compliantPercent: 0, userStatus: "active", registrationStep: "complete", tags: ["department-nursing-direct-care", "position-treatment-nurse-lvn"] },
  { userName: "Anita Walton", email: "anitawalton1509@gmail.com", employeeId: "091529", provider: "Arlington Heights Health And Rehabilitation Center", estDuration: 112, actualTimeSpent: 1411, durationFinal: 80, coursesAssigned: 11, coursesCompleted: 11, completedOnTime: 11, assignedDate: "2025-09-01", dueDate: "2025-09-16", completedDate: "2025-09-12", completePercent: 100, compliantPercent: 100, userStatus: "active", registrationStep: "complete", tags: ["department-nursing-direct-care", "position-certified-nurse-aides-cna"] },
];

function getDepartments(data: LearnerReport[]) {
  return [...new Set(data.flatMap((r) => r.tags.filter((t) => t.startsWith("department-")).map((t) => t.replace("department-", "").replace(/-/g, " "))))];
}

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
}

function formatMins(mins: number) {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function InstructorReportsPage() {
  const [reportData, setReportData] = useState<LearnerReport[]>(mockReport);
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<"mock" | "live">("mock");
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [complianceFilter, setComplianceFilter] = useState<"all" | "compliant" | "non-compliant">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<string>("userName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Try to load live data from API
  const loadLiveData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reports");
      const data = await res.json();
      if (data.rows && data.rows.length > 0) {
        setReportData(data.rows);
        setDataSource("live");
      }
    } catch {
      // Fall back to mock data
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadLiveData(); }, [loadLiveData]);

  const filtered = useMemo(() => {
    let result = reportData;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.userName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.employeeId.includes(q));
    }

    if (deptFilter !== "all") {
      result = result.filter((r) => r.tags.some((t) => t.includes(deptFilter.replace(/ /g, "-"))));
    }

    if (complianceFilter === "compliant") {
      result = result.filter((r) => r.compliantPercent === 100);
    } else if (complianceFilter === "non-compliant") {
      result = result.filter((r) => r.compliantPercent < 100);
    }

    result = [...result].sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortBy];
      const bVal = (b as unknown as Record<string, unknown>)[sortBy];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });

    return result;
  }, [search, deptFilter, complianceFilter, sortBy, sortDir]);

  function handleSort(col: string) {
    if (sortBy === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  }

  function exportCSV() {
    const headers = ["User Name", "Email", "Employee ID", "Provider", "Est. Duration", "Actual Time", "Duration Final", "Courses Assigned", "Courses Completed", "Completed On Time", "Assigned Date", "Due Date", "Completed Date", "Complete %", "Compliant %", "Status", "Tags"];
    const rows = filtered.map((r) => [r.userName, r.email, r.employeeId, r.provider, r.estDuration, r.actualTimeSpent, r.durationFinal, r.coursesAssigned, r.coursesCompleted, r.completedOnTime, r.assignedDate, r.dueDate, r.completedDate, r.completePercent, r.compliantPercent, r.userStatus, r.tags.join(", ")]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `training-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const compliantCount = filtered.filter((r) => r.compliantPercent === 100).length;

  return (
    <div className="p-6 md:p-10">
      {/* Report header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-l)", color: "var(--text-primary)" }}>
            Training Compliance Report
          </h1>
          <p className="mt-1" style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-body)" }}>
            Creative Solutions in Healthcare (All Facilities)
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 rounded-[5px] px-5 py-2.5"
          style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: "var(--btn-primary)", color: "var(--teal-50)" }}
        >
          <IconDownload size={14} />
          Export CSV
        </button>
      </div>

      {/* Report meta */}
      <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)" }}>Completion Date Range</span>
            <div className="flex items-center gap-1.5 mt-1">
              <IconCalendar size={14} style={{ color: "var(--text-muted)" }} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-primary)" }}>2025-04-13 — 2026-04-13</span>
            </div>
          </div>
          <div>
            <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)" }}>Filters</span>
            <div className="mt-1" style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-primary)" }}>
              User Status: Active · {filtered.length} learners · {compliantCount} compliant ({Math.round(compliantCount / filtered.length * 100)}%)
            </div>
          </div>
          <div>
            <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)" }}>Courses</span>
            <div className="mt-1" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
              12 SecureCare courses included
            </div>
          </div>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or employee ID..."
            className="w-full pl-4 pr-4 py-2.5 rounded-lg outline-none"
            style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-primary)", backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5"
          style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)", backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}
        >
          <IconFilter size={14} />
          Filters
          <IconChevronDown size={14} style={{ transform: showFilters ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </button>
      </div>

      {showFilters && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="flex items-center gap-4 mb-4 overflow-hidden">
          <div>
            <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>Department</span>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="rounded-lg px-3 py-2 outline-none appearance-none" style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-primary)", backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)", minWidth: "180px" }}>
              <option value="all">All Departments</option>
              {getDepartments(reportData).map((d) => (<option key={d} value={d}>{d}</option>))}
            </select>
          </div>
          <div>
            <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>Compliance</span>
            <div className="flex gap-1">
              {(["all", "compliant", "non-compliant"] as const).map((f) => (
                <button key={f} onClick={() => setComplianceFilter(f)} className="rounded-lg px-3 py-2" style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 600, backgroundColor: complianceFilter === f ? "var(--btn-primary)" : "var(--bg-raised)", color: complianceFilter === f ? "var(--deep-50)" : "var(--text-muted)", border: "1px solid " + (complianceFilter === f ? "var(--btn-primary)" : "var(--border-default)") }}>
                  {f === "all" ? "All" : f === "compliant" ? "Compliant" : "Non-Compliant"}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Data table */}
      <div className="rounded-2xl overflow-x-auto" style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}>
        <table className="w-full min-w-[1400px]">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-default)", backgroundColor: "var(--bg-surface)" }}>
              {[
                { key: "userName", label: "User Name", w: "180px" },
                { key: "email", label: "Email", w: "200px" },
                { key: "employeeId", label: "Emp ID", w: "80px" },
                { key: "estDuration", label: "Est. Dur", w: "70px" },
                { key: "actualTimeSpent", label: "Actual", w: "70px" },
                { key: "coursesAssigned", label: "Assigned", w: "70px" },
                { key: "coursesCompleted", label: "Done", w: "60px" },
                { key: "completedOnTime", label: "On Time", w: "70px" },
                { key: "assignedDate", label: "Assigned", w: "90px" },
                { key: "dueDate", label: "Due", w: "90px" },
                { key: "completedDate", label: "Completed", w: "90px" },
                { key: "completePercent", label: "Complete", w: "70px" },
                { key: "compliantPercent", label: "Compliant", w: "75px" },
                { key: "tags", label: "Tags", w: "200px" },
              ].map((col) => (
                <th
                  key={col.key}
                  className="text-left px-3 py-3 cursor-pointer hover:bg-[var(--teal-50)] transition-colors"
                  style={{ fontFamily: "var(--font-label)", fontSize: "8px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", minWidth: col.w }}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  {sortBy === col.key && <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, idx) => (
              <tr key={idx} className="hover:bg-[var(--teal-50)] transition-colors duration-100" style={{ borderBottom: "1px solid var(--border-default)" }}>
                <td className="px-3 py-3" style={{ fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{r.userName}</td>
                <td className="px-3 py-3" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>{r.email}</td>
                <td className="px-3 py-3" style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--text-muted)" }}>{r.employeeId}</td>
                <td className="px-3 py-3" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-body)" }}>{formatMins(r.estDuration)}</td>
                <td className="px-3 py-3" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-body)" }}>{formatMins(r.actualTimeSpent)}</td>
                <td className="px-3 py-3" style={{ fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{r.coursesAssigned}</td>
                <td className="px-3 py-3" style={{ fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{r.coursesCompleted}</td>
                <td className="px-3 py-3" style={{ fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 700, color: r.completedOnTime === r.coursesAssigned ? "#445A73" : "var(--amber-600)" }}>{r.completedOnTime}</td>
                <td className="px-3 py-3" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>{formatDate(r.assignedDate)}</td>
                <td className="px-3 py-3" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>{formatDate(r.dueDate)}</td>
                <td className="px-3 py-3" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>{formatDate(r.completedDate)}</td>
                <td className="px-3 py-3">
                  <span className="rounded-full px-2 py-0.5" style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 700, backgroundColor: r.completePercent === 100 ? "#E8F0E8" : "var(--amber-50)", color: r.completePercent === 100 ? "#3A6A5A" : "var(--amber-600)" }}>
                    {r.completePercent}%
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className="rounded-full px-2 py-0.5" style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 700, backgroundColor: r.compliantPercent === 100 ? "#E8F0E8" : "var(--amber-50)", color: r.compliantPercent === 100 ? "#3A6A5A" : "var(--amber-600)" }}>
                    {r.compliantPercent}%
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {r.tags.map((t) => (
                      <span key={t} className="rounded px-1.5 py-0.5" style={{ fontFamily: "var(--font-body)", fontSize: "10px", backgroundColor: "var(--bg-surface)", color: "var(--text-muted)" }}>
                        {t.replace("department-", "").replace("position-", "").replace(/-/g, " ")}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-right" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
        Showing {filtered.length} of {reportData.length} learners{dataSource === "live" && " (live data)"}{loading && " (loading...)"}
      </div>
    </div>
  );
}
