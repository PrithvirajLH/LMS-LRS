"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { FilterBar } from "@/components/training/filter-bar";
import { CourseCardHover, CourseCardHoverGrid } from "@/components/training/course-card-hover";
import type { CourseStatus } from "@/components/dashboard/course-timeline-card";

interface Course {
  id: string;
  title: string;
  category: string;
  duration: string;
  credits: number;
  progress: number;
  status: CourseStatus;
  dueIn?: string;
  currentModule?: string;
  color: string;
}

const allCourses: Course[] = [
  { id: "1", title: "Anti-Harassment Training", category: "Compliance", duration: "8 min", credits: 2, progress: 65, status: "in_progress", dueIn: "Due in 20 days", currentModule: "Module 3: Reporting Procedures", color: "from-[#3A6870] to-[#8ABCC2]" },
  { id: "2", title: "What is Dementia: Etiology and Treatment", category: "Clinical Skills", duration: "30 min", credits: 3, progress: 20, status: "in_progress", dueIn: "Due in 12 days", currentModule: "Drag and Drop: Symptoms vs Causes", color: "from-[#5A6A90] to-[#8A9CC4]" },
  { id: "3", title: "HIPAA Privacy & Security", category: "Compliance", duration: "20 min", credits: 2, progress: 0, status: "overdue", dueIn: "3 days overdue", color: "from-[#7A5430] to-[#D8B890]" },
  { id: "4", title: "Facebook Expectations", category: "Policy", duration: "15 min", credits: 1, progress: 0, status: "not_started", dueIn: "Due in 30 days", color: "from-[#3A6870] to-[#5A6A90]" },
  { id: "5", title: "Infection Control Annual Review", category: "Compliance", duration: "25 min", credits: 2, progress: 100, status: "completed", color: "from-[#5A6A90] to-[#C4CCE0]" },
  { id: "6", title: "Fire Safety & Emergency Procedures", category: "Safety", duration: "20 min", credits: 2, progress: 100, status: "completed", color: "from-[#5A6A90] to-[#C4CCE0]" },
  { id: "7", title: "Abuse & Neglect Prevention", category: "Compliance", duration: "45 min", credits: 3, progress: 0, status: "not_started", dueIn: "Due in 25 days", color: "from-[#3A6870] to-[#8ABCC2]" },
  { id: "8", title: "Bloodborne Pathogens", category: "Safety", duration: "20 min", credits: 2, progress: 45, status: "in_progress", dueIn: "Due in 18 days", currentModule: "Post-Exposure Procedures", color: "from-[#7A5430] to-[#A87840]" },
  { id: "9", title: "Resident Rights", category: "Compliance", duration: "30 min", credits: 2, progress: 100, status: "completed", color: "from-[#5A6A90] to-[#C4CCE0]" },
];

export default function TrainingPageV2() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("due_date");

  const filters = useMemo(() => [
    { label: "All", value: "all", count: allCourses.length },
    { label: "In Progress", value: "in_progress", count: allCourses.filter(c => c.status === "in_progress").length },
    { label: "Overdue", value: "overdue", count: allCourses.filter(c => c.status === "overdue").length },
    { label: "Not Started", value: "not_started", count: allCourses.filter(c => c.status === "not_started").length },
    { label: "Completed", value: "completed", count: allCourses.filter(c => c.status === "completed").length },
  ], []);

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
  }, [activeFilter, search, sortBy]);

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
        className="mb-8"
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "var(--text-display-l)",
            color: "var(--text-primary)",
            lineHeight: "var(--leading-tight)",
          }}
        >
          My Training
        </h1>
        <p
          className="mt-2"
          style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-body)" }}
        >
          All your assigned and enrolled courses in one place.
        </p>
      </motion.div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        filters={filters}
      />

      {/* Aceternity hover effect grid */}
      <CourseCardHoverGrid>
        {(hoveredIndex, setHovered) => (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
            {filtered.map((course, idx) => (
              <CourseCardHover
                key={course.id}
                title={course.title}
                category={course.category}
                duration={course.duration}
                credits={course.credits}
                progress={course.progress}
                status={course.status}
                dueIn={course.dueIn}
                currentModule={course.currentModule}
                color={course.color}
                index={idx}
                isHovered={hoveredIndex === idx}
                onHover={() => setHovered(idx)}
                onLeave={() => setHovered(null)}
              />
            ))}
          </div>
        )}
      </CourseCardHoverGrid>

      {filtered.length === 0 && (
        <div className="text-center py-16" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-muted)" }}>
          No courses match your search.
        </div>
      )}

      <div className="mt-6 text-right" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
        Showing {filtered.length} of {allCourses.length} courses
      </div>
    </div>
  );
}
