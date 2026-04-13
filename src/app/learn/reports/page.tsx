"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ProgressBarChart } from "@/components/reports/progress-bar-chart";
import { ActivityRow } from "@/components/reports/activity-row";
import { IconDownload, IconChartBar, IconListDetails } from "@tabler/icons-react";

interface ReportData {
  monthlyData: Array<{ label: string; value: number; max: number }>;
  scoreDistribution: Array<{ label: string; value: number; max: number; color?: string }>;
  activityLog: Array<{ course: string; parentCourse?: string; action: string; date: string; detail?: string }>;
  summary: {
    totalTrainingTime: string;
    coursesCompleted: number;
    avgScore: string;
    totalStatements: number;
    streak: string;
  };
}

type Tab = "overview" | "activity";

export default function TrainingReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  useEffect(() => {
    fetch("/api/learner/reports")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

  const summary = data?.summary || { totalTrainingTime: "0 min", coursesCompleted: 0, avgScore: "0%", totalStatements: 0, streak: "0 months" };
  const monthlyData = data?.monthlyData || [];
  const scoreDistribution = data?.scoreDistribution || [];
  const activityLog = data?.activityLog || [];

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-l)", color: "var(--text-primary)" }}>
            Training Reports
          </h1>
          <p className="mt-2" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-body)" }}>
            Your learning activity and performance over time.
          </p>
        </div>
        <button
          className="flex items-center gap-2 rounded-[5px] px-5 py-2.5"
          style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: "var(--btn-primary)", color: "var(--teal-50)" }}
        >
          <IconDownload size={14} stroke={1.5} />
          Export PDF
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl p-1 mt-6 mb-8 w-fit" style={{ backgroundColor: "var(--bg-surface)" }}>
        {([
          { id: "overview" as Tab, label: "Overview", icon: <IconChartBar size={15} stroke={1.5} /> },
          { id: "activity" as Tab, label: "Activity Log", icon: <IconListDetails size={15} stroke={1.5} /> },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 rounded-lg px-4 py-2 transition-all duration-200"
            style={{
              fontFamily: "var(--font-body)", fontSize: "13px",
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

      {/* Overview */}
      {activeTab === "overview" && (
        <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {summary.totalStatements === 0 ? (
            <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "16px", color: "var(--text-primary)", fontWeight: 600 }}>No activity yet</p>
              <p className="mt-2" style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-muted)" }}>Start a course to see your training reports here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {/* Completions by month */}
              <div className="rounded-2xl p-6" style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}>
                <h3 style={{ fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>Completions by Month</h3>
                <p className="mt-1 mb-5" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>Courses completed each month</p>
                {monthlyData.some(d => d.value > 0) ? <ProgressBarChart data={monthlyData} /> : <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)" }}>No completions yet</p>}
              </div>

              {/* Score distribution */}
              <div className="rounded-2xl p-6" style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}>
                <h3 style={{ fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>Score Distribution</h3>
                <p className="mt-1 mb-5" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>Assessment scores across all courses</p>
                {scoreDistribution.some(s => s.value > 0) ? <ProgressBarChart data={scoreDistribution} /> : <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)" }}>No scores yet</p>}
              </div>

              {/* Performance summary */}
              <div className="rounded-2xl p-6 col-span-2" style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}>
                <h3 style={{ fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>Performance Summary</h3>
                <p className="mt-1 mb-5" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>Key metrics at a glance</p>
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { label: "Total training time", value: summary.totalTrainingTime },
                    { label: "Courses completed", value: String(summary.coursesCompleted) },
                    { label: "Average score", value: summary.avgScore },
                    { label: "xAPI statements", value: String(summary.totalStatements) },
                    { label: "Active streak", value: summary.streak },
                  ].map((stat) => (
                    <div key={stat.label} className="py-2" style={{ borderBottom: "1px solid var(--border-default)" }}>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)" }}>{stat.label}</div>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Activity Log */}
      {activeTab === "activity" && (
        <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}>
            <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border-default)" }}>
              <h3 style={{ fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>Recent Activity</h3>
              <p className="mt-0.5" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
                {activityLog.length > 0 ? `${activityLog.length} xAPI statements from your learning sessions` : "No activity yet — start a course to see statements here."}
              </p>
            </div>
            {activityLog.length > 0 && (
              <div className="divide-y" style={{ borderColor: "var(--border-default)" }}>
                {activityLog.map((item, idx) => (
                  <ActivityRow key={idx} course={item.course} parentCourse={item.parentCourse} action={item.action} date={item.date} detail={item.detail} index={idx} />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
