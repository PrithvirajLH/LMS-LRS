"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { WelcomeStripV2 } from "@/components/dashboard/welcome-strip-v2";
import { ProgressGauge } from "@/components/dashboard/progress-gauge";
import { StatCardBento } from "@/components/dashboard/stat-card-bento";
import { CourseTimelineCard } from "@/components/dashboard/course-timeline-card";
import type { CourseStatus } from "@/components/dashboard/course-timeline-card";

// ── Mock data (will be replaced with LRS API calls) ──
interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  credits: number;
  creditsEarned: number;
  progress: number;
  status: CourseStatus;
  dueIn?: string;
  currentModule?: string;
  color: string;
}

const mockCourses: Course[] = [
  {
    id: "1",
    title: "Anti-Harassment Training",
    description: "Comprehensive training on preventing workplace harassment, focusing on compliance with federal regulations and creating a respectful workplace.",
    category: "Compliance",
    duration: "8 minutes",
    credits: 2,
    creditsEarned: 0,
    progress: 65,
    status: "in_progress",
    dueIn: "Due in 20 days",
    currentModule: "Module 3: Reporting Procedures",
    color: "from-[#445A73] to-[#A8BDD4]",
  },
  {
    id: "2",
    title: "What is Dementia: Etiology and Treatment",
    description: "Understanding dementia causes, symptoms, brain changes, and how to provide compassionate, effective care for residents.",
    category: "Clinical Skills",
    duration: "30 minutes",
    credits: 3,
    creditsEarned: 0,
    progress: 20,
    status: "in_progress",
    dueIn: "Due in 12 days",
    currentModule: "Drag and Drop: Symptoms vs Causes",
    color: "from-[#2A3D52] to-[#647A93]",
  },
  {
    id: "3",
    title: "HIPAA Privacy & Security",
    description: "Protecting patient health information, understanding privacy rules, and avoiding common HIPAA violations in daily workflows.",
    category: "Compliance",
    duration: "20 minutes",
    credits: 2,
    creditsEarned: 0,
    progress: 0,
    status: "overdue",
    dueIn: "3 days overdue",
    color: "from-[#A06830] to-[#D4A860]",
  },
  {
    id: "4",
    title: "Facebook Expectations",
    description: "Social media guidelines for representing our facilities online with professionalism, compliance, and brand consistency.",
    category: "Policy",
    duration: "15 minutes",
    credits: 1,
    creditsEarned: 0,
    progress: 0,
    status: "not_started",
    dueIn: "Due in 30 days",
    color: "from-[#445A73] to-[#647A93]",
  },
  {
    id: "5",
    title: "Bloodborne Pathogens",
    description: "OSHA requirements for exposure control, safe handling of sharps, and post-exposure procedures in healthcare.",
    category: "Safety",
    duration: "20 minutes",
    credits: 2,
    creditsEarned: 0,
    progress: 0,
    status: "due_soon",
    dueIn: "Due in 3 days",
    color: "from-[#A06830] to-[#D4A860]",
  },
  {
    id: "6",
    title: "Infection Control Annual Review",
    description: "Best practices for preventing infections, hand hygiene protocols, and PPE usage in senior care settings.",
    category: "Compliance",
    duration: "25 minutes",
    credits: 2,
    creditsEarned: 2,
    progress: 100,
    status: "completed",
    color: "from-[#445A73] to-[#A8BDD4]",
  },
  {
    id: "7",
    title: "Fire Safety & Emergency Procedures",
    description: "Emergency evacuation procedures, fire extinguisher use, and life safety protocols for healthcare facilities.",
    category: "Safety",
    duration: "20 minutes",
    credits: 2,
    creditsEarned: 2,
    progress: 100,
    status: "completed",
    color: "from-[#445A73] to-[#A8BDD4]",
  },
];

export default function LearnDashboard() {
  const [showCompleted, setShowCompleted] = useState(true);

  const activeCourses = mockCourses.filter((c) => c.status !== "completed");
  const completedCourses = mockCourses.filter((c) => c.status === "completed");
  const totalCourses = mockCourses.length;
  const completedCount = completedCourses.length;
  const totalCredits = mockCourses.reduce((sum, c) => sum + c.credits, 0);
  const earnedCredits = mockCourses.reduce((sum, c) => sum + c.creditsEarned, 0);
  const inProgressCount = activeCourses.filter((c) => c.status === "in_progress").length;
  const overdueCount = activeCourses.filter((c) => c.status === "overdue").length;
  const percentage = Math.round((completedCount / totalCourses) * 100);

  const displayedCourses = showCompleted ? mockCourses : activeCourses;

  return (
    // <div className="px-8 py-8"> 
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      {/* Zone 1: Welcome Strip */}
      <WelcomeStripV2
        name="Jane"
        lastCourse="Anti-Harassment Training"
        lastModule="Module 3: Reporting Procedures"
        daysUntilDeadline={12}
        deadlineCourse="What is Dementia: Etiology and Treatment"
      />

      {/* Main layout: timeline left, gauge right */}
      <div className="flex gap-10">
        {/* Left column: stats + timeline */}
        <div className="flex-1 min-w-0">
          {/* Zone 2A: Stat cards */}
          <motion.div
            className="grid grid-cols-4 gap-3 mb-8"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: [0.2, 0, 0, 1] }}
          >
            <StatCardBento label="Training Hours" value={`${earnedCredits} / ${totalCredits}`} color="teal" description="hours completed" />
            <StatCardBento label="In Progress" value={inProgressCount} color="teal" description="active courses" />
            <StatCardBento label="Certificates" value={completedCount} color="slate" description="earned" />
            <StatCardBento label="Overdue" value={overdueCount} color="amber" description={overdueCount > 0 ? "needs attention" : "all on track"} />
          </motion.div>

          {/* Zone 2B: Learning Path header */}
          <div className="flex items-center justify-between mb-5">
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "var(--text-display-m)",
                color: "var(--text-primary)",
              }}
            >
              My Learning Path
            </h2>

            {/* Show completed toggle */}
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex items-center gap-2"
            >
              <div
                className="w-9 h-5 rounded-full relative transition-colors duration-200"
                style={{
                  backgroundColor: showCompleted ? "var(--teal-400)" : "var(--stone-200)",
                }}
              >
                <motion.div
                  className="w-4 h-4 rounded-full absolute top-0.5"
                  style={{ backgroundColor: "var(--bg-raised)" }}
                  animate={{ left: showCompleted ? 18 : 2 }}
                  transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                />
              </div>
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "14px",
                  color: "var(--text-muted)",
                }}
              >
                Show Completed ({completedCount})
              </span>
            </button>
          </div>

          {/* Zone 2B: Course timeline */}
          <div>
            {displayedCourses.map((course, idx) => (
              <CourseTimelineCard
                key={course.id}
                title={course.title}
                description={course.description}
                category={course.category}
                duration={course.duration}
                credits={course.credits}
                creditsEarned={course.creditsEarned}
                progress={course.progress}
                status={course.status}
                dueIn={course.dueIn}
                currentModule={course.currentModule}
                color={course.color}
                index={idx}
              />
            ))}
          </div>
        </div>

        {/* Right column: progress gauge (sticky) */}
        <div className="w-[240px] shrink-0">
          <div className="sticky top-10">
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3, ease: [0.2, 0, 0, 1] }}
              className="rounded-2xl px-6 py-8"
              style={{
                backgroundColor: "var(--bg-raised)",
                border: "1px solid var(--border-default)",
              }}
            >
              <ProgressGauge
                percentage={percentage}
                completed={completedCount}
                total={totalCourses}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
