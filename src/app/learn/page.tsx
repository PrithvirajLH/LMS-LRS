"use client";

import { Suspense, useState, useEffect } from "react";
import { motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { WelcomeStripV2 } from "@/components/dashboard/welcome-strip-v2";
import { ProgressGauge } from "@/components/dashboard/progress-gauge";
import { StatCardBento } from "@/components/dashboard/stat-card-bento";
import { CourseTimelineCard } from "@/components/dashboard/course-timeline-card";
import type { CourseStatus } from "@/components/dashboard/course-timeline-card";
import { CompletionCelebration } from "@/components/celebration/completion-celebration";

interface DashboardData {
  user: { name: string; email: string; role: string; facility: string };
  courses: Array<{
    id: string; title: string; description: string; category: string;
    duration: string; credits: number; creditsEarned: number; progress: number;
    status: string; dueDate: string; completedDate: string; score: number;
    color: string; launchUrl: string;
  }>;
  stats: { totalCourses: number; completed: number; inProgress: number; overdue: number; totalCredits: number; earnedCredits: number; expiringSoon: number; expired: number };
  lastActivity: { courseTitle: string; moduleName?: string; courseId?: string; activityId: string; verb: string } | null;
  nextDeadline: { courseTitle: string; daysRemaining: number } | null;
}

function getDueLabel(dueDate: string, status: string): string | undefined {
  if (!dueDate || status === "completed") return undefined;
  const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)} days overdue`;
  if (diff === 0) return "Due today";
  return `Due in ${diff} days`;
}

function mapStatus(status: string, dueDate: string): CourseStatus {
  if (status === "completed") return "completed";
  if (status === "in_progress") return "in_progress";
  if (dueDate && new Date(dueDate) < new Date()) return "overdue";
  if (dueDate) {
    const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff <= 7) return "due_soon";
  }
  return "not_started";
}

/**
 * Reads the `?celebrate={courseId}` URL param and, once dashboard data is
 * loaded, fires the celebration modal if that course is now completed.
 *
 * This handles the "learner closed the player and came back" path. We strip
 * the param from the URL after surfacing the modal so a refresh doesn't
 * re-fire it. Wrapped in its own component because `useSearchParams`
 * requires a Suspense boundary in Next.js.
 */
function CelebrationFromQuery({ data }: { data: DashboardData | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const celebrateId = searchParams.get("celebrate");

  const [shown, setShown] = useState<{
    courseTitle: string;
    score?: number;
    credits: number;
  } | null>(null);
  const [hasFired, setHasFired] = useState(false);

  useEffect(() => {
    if (!celebrateId || !data || hasFired) return;
    const course = data.courses.find((c) => c.id === celebrateId);

    // Strip the celebrate param either way so a refresh doesn't re-fire.
    const params = new URLSearchParams(searchParams.toString());
    params.delete("celebrate");
    const qs = params.toString();
    const cleanUrl = qs ? `/learn?${qs}` : "/learn";

    if (!course || course.status !== "completed") {
      // Stale celebrate param (course not actually complete yet, or
      // doesn't exist for this learner) — strip silently.
      setHasFired(true);
      router.replace(cleanUrl, { scroll: false });
      return;
    }

    setHasFired(true);
    setShown({
      courseTitle: course.title,
      score: course.score || undefined,
      credits: course.credits || 0,
    });
    router.replace(cleanUrl, { scroll: false });
  }, [celebrateId, data, hasFired, router, searchParams]);

  return (
    <CompletionCelebration
      open={!!shown}
      courseTitle={shown?.courseTitle || ""}
      score={shown?.score}
      credits={shown?.credits ?? 0}
      onClose={() => setShown(null)}
      onViewCertificate={() => {
        setShown(null);
        router.push("/learn/completions");
      }}
    />
  );
}

function LearnDashboardInner() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    fetch("/api/learner/dashboard")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-40 rounded-2xl" style={{ backgroundColor: "var(--bg-surface)" }} />
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl" style={{ backgroundColor: "var(--bg-surface)" }} />)}
          </div>
        </div>
      </div>
    );
  }

  const user = data?.user || { name: "User", email: "", role: "", facility: "" };
  const courses = data?.courses || [];
  const stats = data?.stats || { totalCourses: 0, completed: 0, inProgress: 0, overdue: 0, totalCredits: 0, earnedCredits: 0, expiringSoon: 0, expired: 0 };
  const lastActivity = data?.lastActivity || null;
  const nextDeadline = data?.nextDeadline || null;
  const activeCourses = courses.filter((c) => c.status !== "completed");
  const completedCourses = courses.filter((c) => c.status === "completed");
  const displayedCourses = showCompleted ? courses : activeCourses;
  const percentage = stats.totalCourses > 0 ? Math.round((stats.completed / stats.totalCourses) * 100) : 0;

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      <WelcomeStripV2
        name={user.name.split(" ")[0]}
        lastCourse={lastActivity?.courseTitle}
        lastModule={lastActivity?.moduleName || undefined}
        daysUntilDeadline={nextDeadline?.daysRemaining ?? undefined}
        deadlineCourse={nextDeadline?.courseTitle}
        resumeCourseId={lastActivity?.courseId || courses.find(c => c.status === "in_progress")?.id}
      />

      {/* CE credit renewal banner */}
      {(stats.expired > 0 || stats.expiringSoon > 0) && (
        <a
          href="/learn/completions"
          className="mt-6 flex items-center gap-4 rounded-2xl px-5 py-4 transition-colors duration-200 hover:opacity-90"
          style={{
            backgroundColor: stats.expired > 0 ? "rgba(192, 74, 64, 0.06)" : "var(--amber-50)",
            border: stats.expired > 0 ? "1px solid rgba(192, 74, 64, 0.2)" : "1px solid var(--amber-100)",
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: stats.expired > 0 ? "rgba(192, 74, 64, 0.1)" : "var(--amber-100)" }}
          >
            <span style={{ fontSize: "20px" }}>{stats.expired > 0 ? "⚠" : "⏱"}</span>
          </div>
          <div className="flex-1">
            <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
              {stats.expired > 0 && `${stats.expired} CE credit${stats.expired > 1 ? "s have" : " has"} expired`}
              {stats.expired > 0 && stats.expiringSoon > 0 && " · "}
              {stats.expiringSoon > 0 && `${stats.expiringSoon} expiring soon`}
            </p>
            <p className="mt-0.5" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
              View completions to renew before they affect your compliance status →
            </p>
          </div>
        </a>
      )}

      <div className="flex gap-10">
        <div className="flex-1 min-w-0">
          <motion.div className="grid grid-cols-4 gap-3 mb-8" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
            <StatCardBento label="Total Courses" value={stats.totalCourses} color="teal" />
            <StatCardBento label="In Progress" value={stats.inProgress} color="teal" />
            <StatCardBento label="Certificates" value={stats.completed} color="slate" />
            <StatCardBento label="Overdue" value={stats.overdue} color="amber" />
          </motion.div>

          <div className="flex items-center justify-between mb-5">
            <h2 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-m)", color: "var(--text-primary)" }}>
              My Learning Path
            </h2>
            <button onClick={() => setShowCompleted(!showCompleted)} className="flex items-center gap-2">
              <div className="w-9 h-5 rounded-full relative transition-colors duration-200" style={{ backgroundColor: showCompleted ? "var(--teal-400)" : "var(--stone-200)" }}>
                <motion.div className="w-4 h-4 rounded-full absolute top-0.5" style={{ backgroundColor: "var(--bg-raised)" }} animate={{ left: showCompleted ? 18 : 2 }} transition={{ duration: 0.2 }} />
              </div>
              <span style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-muted)" }}>Show Completed ({completedCourses.length})</span>
            </button>
          </div>

          <div>
            {displayedCourses.length === 0 && (
              <div className="text-center py-12 rounded-2xl" style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-primary)", fontWeight: 600 }}>No courses assigned yet</p>
                <p className="mt-2" style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)" }}>Your training will appear here once courses are assigned to you.</p>
              </div>
            )}
            {displayedCourses.map((course, idx) => (
              <CourseTimelineCard
                key={course.id}
                courseId={course.id}
                title={course.title}
                description={course.description}
                category={course.category}
                duration={course.duration}
                credits={course.credits}
                creditsEarned={course.creditsEarned}
                progress={course.progress}
                status={mapStatus(course.status, course.dueDate)}
                dueIn={getDueLabel(course.dueDate, course.status)}
                color={course.color}
                index={idx}
                totalModules={(course as { totalModules?: number }).totalModules}
                completedModules={(course as { completedModules?: number }).completedModules}
              />
            ))}
          </div>
        </div>

        <div className="w-[240px] shrink-0">
          <div className="sticky top-10">
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
              className="rounded-2xl px-6 py-8" style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}>
              <ProgressGauge percentage={percentage} completed={stats.completed} total={stats.totalCourses} />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Celebration triggered by ?celebrate={courseId} URL param — fires
          when the learner closes the player and lands back here. */}
      <CelebrationFromQuery data={data} />
    </div>
  );
}

export default function LearnDashboard() {
  // useSearchParams (used inside CelebrationFromQuery, called from
  // LearnDashboardInner) requires a Suspense boundary in Next.js 16.
  return (
    <Suspense fallback={null}>
      <LearnDashboardInner />
    </Suspense>
  );
}
