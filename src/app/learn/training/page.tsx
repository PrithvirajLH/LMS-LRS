"use client";

import { useState, useMemo, useEffect } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { FilterBar } from "@/components/training/filter-bar";
import { CourseCard } from "@/components/training/course-card";
import type { CourseStatus } from "@/components/dashboard/course-timeline-card";

interface Course {
  id: string; title: string; category: string; duration: string; credits: number;
  progress: number; status: CourseStatus; dueIn?: string; currentModule?: string; color: string;
}

function mapStatus(status: string, dueDate?: string): CourseStatus {
  if (status === "completed") return "completed";
  if (status === "in_progress") return "in_progress";
  if (dueDate && new Date(dueDate) < new Date()) return "overdue";
  return "not_started";
}

function getDueLabel(dueDate?: string, status?: string): string | undefined {
  if (!dueDate || status === "completed") return undefined;
  const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)} days overdue`;
  if (diff === 0) return "Due today";
  return `Due in ${diff} days`;
}

export default function TrainingPage() {
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("due_date");

  useEffect(() => {
    fetch("/api/learner/dashboard")
      .then((r) => r.json())
      .then((data) => {
        if (data.courses) {
          setAllCourses(data.courses.map((c: { id: string; title: string; category: string; duration: string; credits: number; progress: number; status: string; dueDate: string; color: string }) => ({
            id: c.id, title: c.title, category: c.category, duration: c.duration,
            credits: c.credits, progress: c.progress,
            status: mapStatus(c.status, c.dueDate),
            dueIn: getDueLabel(c.dueDate, c.status),
            color: c.color || "from-[#445A73] to-[#A8BDD4]",
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filters = useMemo(() => [
    { label: "All", value: "all", count: allCourses.length },
    { label: "In Progress", value: "in_progress", count: allCourses.filter(c => c.status === "in_progress").length },
    { label: "Overdue", value: "overdue", count: allCourses.filter(c => c.status === "overdue").length },
    { label: "Not Started", value: "not_started", count: allCourses.filter(c => c.status === "not_started").length },
    { label: "Completed", value: "completed", count: allCourses.filter(c => c.status === "completed").length },
  ], [allCourses]);

  const filtered = useMemo(() => {
    let result = allCourses;
    if (activeFilter !== "all") result = result.filter((c) => c.status === activeFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      if (sortBy === "name") return a.title.localeCompare(b.title);
      if (sortBy === "progress") return b.progress - a.progress;
      if (sortBy === "category") return a.category.localeCompare(b.category);
      const statusOrder: Record<string, number> = { overdue: 0, in_progress: 1, due_soon: 2, not_started: 3, completed: 4 };
      return (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
    });
    return result;
  }, [allCourses, activeFilter, search, sortBy]);

  if (loading) {
    return <div className="p-6 md:p-10 max-w-[1200px] mx-auto"><div className="animate-pulse h-8 w-48 rounded" style={{ backgroundColor: "var(--bg-surface)" }} /></div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      <div className="mb-8">
        <h1 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-l)", color: "var(--text-primary)" }}>My Training</h1>
        <p className="mt-2" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-body)" }}>
          {allCourses.length > 0 ? "All your assigned and enrolled courses in one place." : "No courses assigned yet."}
        </p>
      </div>

      {allCourses.length > 0 && (
        <>
          <FilterBar search={search} onSearchChange={setSearch} activeFilter={activeFilter} onFilterChange={setActiveFilter} sortBy={sortBy} onSortChange={setSortBy} filters={filters} />
          <LayoutGroup>
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <AnimatePresence mode="popLayout">
                {filtered.map((course, idx) => (
                  <CourseCard key={course.id} courseId={course.id} title={course.title} category={course.category} duration={course.duration} credits={course.credits} progress={course.progress} status={course.status} dueIn={course.dueIn} currentModule={course.currentModule} color={course.color} index={idx} />
                ))}
              </AnimatePresence>
            </motion.div>
          </LayoutGroup>
          <div className="mt-6 text-right" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
            Showing {filtered.length} of {allCourses.length} courses
          </div>
        </>
      )}
    </div>
  );
}
