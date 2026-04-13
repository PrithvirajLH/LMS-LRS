"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ProgressBarChart } from "@/components/reports/progress-bar-chart";
import { ActivityRow } from "@/components/reports/activity-row";
import { IconDownload, IconCalendar, IconChartBar, IconListDetails } from "@tabler/icons-react";

// Mock data — will come from LRS queries
const monthlyData = [
  { label: "Jan", value: 3, max: 8 },
  { label: "Feb", value: 5, max: 8 },
  { label: "Mar", value: 4, max: 8 },
  { label: "Apr", value: 2, max: 8 },
];

const categoryData = [
  { label: "Compliance", value: 6, max: 8, color: "#445A73" },
  { label: "Clinical Skills", value: 3, max: 8, color: "#647A93" },
  { label: "Safety", value: 4, max: 8, color: "#A8BDD4" },
  { label: "Policy", value: 1, max: 8, color: "#CCDDE8" },
];

const scoreData = [
  { label: "90–100%", value: 4, max: 6 },
  { label: "80–89%", value: 2, max: 6 },
  { label: "70–79%", value: 0, max: 6 },
  { label: "Below 70%", value: 0, max: 6, color: "var(--amber-400)" },
];

const recentActivity = [
  { course: "Infection Control Annual Review", action: "completed", date: "2026-03-28T14:22:00", detail: "Score: 92%" },
  { course: "Infection Control Annual Review", action: "passed", date: "2026-03-28T14:20:00", detail: "Quiz 3/3" },
  { course: "Infection Control Annual Review", action: "attempted", date: "2026-03-28T13:45:00", detail: "Module 8" },
  { course: "Fire Safety & Emergency Procedures", action: "completed", date: "2026-03-15T11:10:00", detail: "Score: 88%" },
  { course: "Fire Safety & Emergency Procedures", action: "passed", date: "2026-03-15T11:08:00", detail: "Quiz 2/2" },
  { course: "Anti-Harassment Training", action: "resumed", date: "2026-03-12T09:30:00", detail: "Module 3" },
  { course: "Anti-Harassment Training", action: "started", date: "2026-03-10T08:15:00" },
  { course: "What is Dementia: Etiology and Treatment", action: "attempted", date: "2026-03-08T16:00:00", detail: "Drag and Drop" },
  { course: "What is Dementia: Etiology and Treatment", action: "started", date: "2026-03-05T10:20:00" },
  { course: "HIPAA Privacy Basics", action: "completed", date: "2026-02-10T15:45:00", detail: "Score: 95%" },
  { course: "Hand Hygiene Essentials", action: "completed", date: "2026-01-22T12:30:00", detail: "Score: 100%" },
  { course: "Workplace Violence Prevention", action: "completed", date: "2025-12-05T09:15:00", detail: "Score: 85%" },
];

type Tab = "overview" | "activity";

export default function TrainingReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [dateRange, setDateRange] = useState("6months");

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "var(--text-display-l)",
              color: "var(--text-primary)",
              lineHeight: "var(--leading-tight)",
            }}
          >
            Training Reports
          </h1>
          <p
            className="mt-2"
            style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-body)" }}
          >
            Your learning activity and performance over time.
          </p>
        </div>

        {/* Export button */}
        <button
          className="flex items-center gap-2 rounded-[5px] px-5 py-2.5 transition-colors duration-200"
          style={{
            fontFamily: "var(--font-label)",
            fontSize: "11px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            backgroundColor: "var(--btn-primary)",
            color: "var(--teal-50)",
          }}
        >
          <IconDownload size={14} stroke={1.5} />
          Export PDF
        </button>
      </motion.div>

      {/* Tab bar + date range */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center justify-between mt-6 mb-8"
      >
        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-xl p-1" style={{ backgroundColor: "var(--bg-surface)" }}>
          {([
            { id: "overview" as Tab, label: "Overview", icon: <IconChartBar size={15} stroke={1.5} /> },
            { id: "activity" as Tab, label: "Activity Log", icon: <IconListDetails size={15} stroke={1.5} /> },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 rounded-lg px-4 py-2 transition-all duration-200"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "13px",
                fontWeight: activeTab === tab.id ? 600 : 400,
                backgroundColor: activeTab === tab.id ? "var(--bg-raised)" : "transparent",
                color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-muted)",
                boxShadow: activeTab === tab.id ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <IconCalendar size={15} stroke={1.5} style={{ color: "var(--text-muted)" }} />
          {(["3months", "6months", "1year", "all"] as const).map((range) => {
            const labels: Record<string, string> = { "3months": "3M", "6months": "6M", "1year": "1Y", all: "All" };
            return (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className="rounded-lg px-3 py-1.5 transition-colors duration-200"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "12px",
                  fontWeight: 600,
                  backgroundColor: dateRange === range ? "var(--btn-primary)" : "transparent",
                  color: dateRange === range ? "var(--deep-50)" : "var(--text-muted)",
                }}
              >
                {labels[range]}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Content */}
      {activeTab === "overview" ? (
        <motion.div
          key="overview"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Charts grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Completions by month */}
            <div
              className="rounded-2xl p-6"
              style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}
            >
              <h3
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                Completions by Month
              </h3>
              <p className="mt-1 mb-5" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
                Courses completed each month
              </p>
              <ProgressBarChart data={monthlyData} />
            </div>

            {/* By category */}
            <div
              className="rounded-2xl p-6"
              style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}
            >
              <h3
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                By Category
              </h3>
              <p className="mt-1 mb-5" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
                Training distribution across categories
              </p>
              <ProgressBarChart data={categoryData} />
            </div>

            {/* Score distribution */}
            <div
              className="rounded-2xl p-6"
              style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}
            >
              <h3
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                Score Distribution
              </h3>
              <p className="mt-1 mb-5" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
                Assessment scores across all courses
              </p>
              <ProgressBarChart data={scoreData} />
            </div>

            {/* Quick stats */}
            <div
              className="rounded-2xl p-6"
              style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}
            >
              <h3
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                Performance Summary
              </h3>
              <p className="mt-1 mb-5" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
                Key metrics at a glance
              </p>
              <div className="space-y-4">
                {[
                  { label: "Total training time", value: "2.5 hours" },
                  { label: "Courses completed", value: "6" },
                  { label: "Average score", value: "92%" },
                  { label: "Credits earned", value: "11" },
                  { label: "Streak", value: "4 months" },
                  { label: "Certifications active", value: "3" },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between py-1" style={{ borderBottom: "1px solid var(--border-default)" }}>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-body)" }}>{stat.label}</span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="activity"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Activity log */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}
          >
            <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-default)" }}>
              <h3 style={{ fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
                Recent Activity
              </h3>
              <p className="mt-0.5" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
                All xAPI statements from your learning sessions
              </p>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border-default)" }}>
              {recentActivity.map((item, idx) => (
                <ActivityRow
                  key={idx}
                  course={item.course}
                  action={item.action}
                  date={item.date}
                  detail={item.detail}
                  index={idx}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
