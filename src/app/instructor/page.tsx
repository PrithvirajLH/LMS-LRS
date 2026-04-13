"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { IconUpload, IconBooks, IconUsers, IconReportAnalytics, IconTrendingUp, IconClock } from "@tabler/icons-react";

interface Stats {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalStatements: number;
  totalLearners: number;
}

interface RecentActivityItem {
  action: string;
  detail: string;
  time: string;
}

export default function InstructorDashboard() {
  const [stats, setStats] = useState<Stats>({ totalCourses: 0, publishedCourses: 0, draftCourses: 0, totalStatements: 0, totalLearners: 0 });
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);

  useEffect(() => {
    // Fetch course stats
    fetch("/api/admin/courses")
      .then((r) => r.json())
      .then((data) => {
        const courses = data.courses || [];
        setStats((prev) => ({
          ...prev,
          totalCourses: courses.length,
          publishedCourses: courses.filter((c: { status: string }) => c.status === "published").length,
          draftCourses: courses.filter((c: { status: string }) => c.status === "draft").length,
        }));
      })
      .catch(() => {});

    // Fetch statement stats
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        setStats((prev) => ({ ...prev, totalStatements: data.totalStatements || 0 }));
        // Build recent activity from top actors/verbs
        const activity: RecentActivityItem[] = [];
        if (data.topVerbs) {
          for (const v of data.topVerbs.slice(0, 5)) {
            activity.push({ action: `${v.count} ${v.verb} statements`, detail: "This month", time: "recent" });
          }
        }
        setRecentActivity(activity);
      })
      .catch(() => {});

    // Fetch learner count
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => {
        setStats((prev) => ({ ...prev, totalLearners: (data.users || []).length }));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-l)", color: "var(--text-primary)" }}>
          Instructor Dashboard
        </h1>
        <p className="mt-2" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-body)" }}>
          Manage courses, track learner progress, and run reports.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mt-8">
        {[
          { label: "Published Courses", value: stats.publishedCourses, icon: <IconBooks size={22} stroke={1.5} />, color: "#445A73" },
          { label: "Draft Courses", value: stats.draftCourses, icon: <IconClock size={22} stroke={1.5} />, color: "var(--text-muted)" },
          { label: "Total Learners", value: stats.totalLearners, icon: <IconUsers size={22} stroke={1.5} />, color: "#445A73" },
          { label: "xAPI Statements", value: stats.totalStatements, icon: <IconTrendingUp size={22} stroke={1.5} />, color: "#445A73" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="rounded-xl px-6 py-5 flex items-center gap-4"
            style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--teal-50)", color: stat.color }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)" }}>{stat.label}</div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-stat-l)", fontWeight: 700, color: stat.color }}>{stat.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick actions */}
      <h2 className="mt-10 mb-4" style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-s)", color: "var(--text-primary)" }}>
        Quick Actions
      </h2>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Upload Course", desc: "Add a new Storyline xAPI package", href: "/instructor/courses/upload", icon: <IconUpload size={24} stroke={1.5} /> },
          { label: "Manage Courses", desc: "Edit, publish, or archive courses", href: "/instructor/courses", icon: <IconBooks size={24} stroke={1.5} /> },
          { label: "Learner Reports", desc: "View completion rates and scores", href: "/instructor/reports", icon: <IconReportAnalytics size={24} stroke={1.5} /> },
        ].map((action) => (
          <Link key={action.href} href={action.href}>
            <div
              className="rounded-2xl p-6 transition-all duration-200 hover:shadow-lg hover:shadow-black/[0.04] cursor-pointer group"
              style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors duration-200 group-hover:bg-[var(--btn-primary)]" style={{ backgroundColor: "var(--teal-50)", color: "#445A73" }}>
                <span className="group-hover:text-white transition-colors duration-200">{action.icon}</span>
              </div>
              <h3 style={{ fontFamily: "var(--font-body)", fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>{action.label}</h3>
              <p className="mt-1" style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)" }}>{action.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <h2 className="mt-10 mb-4" style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-s)", color: "var(--text-primary)" }}>
        Recent Activity
      </h2>
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}>
        {recentActivity.length === 0 ? (
          <div className="px-6 py-8 text-center" style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-muted)" }}>
            No recent activity yet. Activity will appear here as learners interact with courses.
          </div>
        ) : null}
        {recentActivity.map((item, idx) => (
          <div key={idx} className="flex items-center gap-4 px-6 py-4 transition-colors duration-150 hover:bg-[var(--teal-50)]" style={{ borderBottom: idx < recentActivity.length - 1 ? "1px solid var(--border-default)" : "none" }}>
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "#445A73" }} />
            <div className="flex-1">
              <span style={{ fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{item.action}</span>
              <span className="mx-2" style={{ color: "var(--border-default)" }}>—</span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-body)" }}>{item.detail}</span>
            </div>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
