"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ProgressGauge } from "@/components/dashboard/progress-gauge";
import { CourseTimelineCard } from "@/components/dashboard/course-timeline-card";
import { ColorLabel, ColorLabelProvider } from "@/components/ui/color-label";
import type { CourseStatus } from "@/components/dashboard/course-timeline-card";

/**
 * V2 — Dusty Teal & Stone palette WITH color labels + toggle
 */

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
  { id: "1", title: "Anti-Harassment Training", description: "Comprehensive training on preventing workplace harassment, focusing on compliance with federal regulations and creating a respectful workplace.", category: "Compliance", duration: "8 minutes", credits: 2, creditsEarned: 0, progress: 65, status: "in_progress", dueIn: "Due in 20 days", currentModule: "Module 3: Reporting Procedures", color: "from-[#3A6870] to-[#8ABCC2]" },
  { id: "2", title: "What is Dementia: Etiology and Treatment", description: "Understanding dementia causes, symptoms, brain changes, and how to provide compassionate, effective care for residents.", category: "Clinical Skills", duration: "30 minutes", credits: 3, creditsEarned: 0, progress: 20, status: "in_progress", dueIn: "Due in 12 days", currentModule: "Drag and Drop: Symptoms vs Causes", color: "from-[#5A6A90] to-[#8A9CC4]" },
  { id: "3", title: "HIPAA Privacy & Security", description: "Protecting patient health information, understanding privacy rules, and avoiding common HIPAA violations in daily workflows.", category: "Compliance", duration: "20 minutes", credits: 2, creditsEarned: 0, progress: 0, status: "overdue", dueIn: "3 days overdue", color: "from-[#7A5430] to-[#D8B890]" },
  { id: "4", title: "Facebook Expectations", description: "Social media guidelines for representing our facilities online with professionalism, compliance, and brand consistency.", category: "Policy", duration: "15 minutes", credits: 1, creditsEarned: 0, progress: 0, status: "not_started", dueIn: "Due in 30 days", color: "from-[#3A6870] to-[#5A6A90]" },
  { id: "5", title: "Infection Control Annual Review", description: "Best practices for preventing infections, hand hygiene protocols, and PPE usage in senior care settings.", category: "Compliance", duration: "25 minutes", credits: 2, creditsEarned: 2, progress: 100, status: "completed", color: "from-[#5A6A90] to-[#C4CCE0]" },
  { id: "6", title: "Fire Safety & Emergency Procedures", description: "Emergency evacuation procedures, fire extinguisher use, and life safety protocols for healthcare facilities.", category: "Safety", duration: "20 minutes", credits: 2, creditsEarned: 2, progress: 100, status: "completed", color: "from-[#5A6A90] to-[#C4CCE0]" },
];

export default function LearnDashboardV2() {
  const [showCompleted, setShowCompleted] = useState(false);

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
    <ColorLabelProvider>
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto relative">
      {/* Page background labels — 2 layers */}
      <ColorLabel hex="#F5F4F0" role="PAGE BG (--stone-50)" position="top-left" />
      <div className="absolute top-8 left-2 z-50">
        <ColorLabel hex="#FDFCFA" role="RAISED (content area)" position="top-left" />
      </div>

      {/* Color legend */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { hex: "#F5F4F0", label: "PAGE BG" },
          { hex: "#FDFCFA", label: "RAISED" },
          { hex: "#E8EAE4", label: "SURFACE" },
          { hex: "#142830", label: "DEEP" },
          { hex: "#3A6870", label: "PRIMARY" },
          { hex: "#5A6A90", label: "SECONDARY" },
          { hex: "#7A5430", label: "DANGER" },
          { hex: "#EAF3F4", label: "HIGHLIGHT" },
          { hex: "#CCD4CE", label: "BORDER" },
        ].map(c => (
          <div key={c.hex} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1" style={{ border: "1px solid var(--border-default)", backgroundColor: "var(--bg-raised)" }}>
            <div className="w-3.5 h-3.5 rounded" style={{ backgroundColor: c.hex, border: "1px solid var(--border-default)" }} />
            <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.12em", color: "var(--text-primary)", textTransform: "uppercase" }}>{c.label}</span>
            <span style={{ fontFamily: "monospace", fontSize: "9px", color: "var(--text-muted)" }}>{c.hex}</span>
          </div>
        ))}
      </div>

      {/* Welcome Strip */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl px-10 py-8 mb-8 relative overflow-hidden"
        style={{ backgroundColor: "var(--bg-dark)" }}
      >
        <ColorLabel hex="#142830" role="DEEP (banner)" position="top-right" />
        <motion.div
          className="absolute inset-0 opacity-20"
          style={{ background: "radial-gradient(ellipse at 20% 50%, var(--teal-400), transparent 60%), radial-gradient(ellipse at 80% 20%, var(--slate-400), transparent 50%)" }}
          animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />
        <div className="flex items-center justify-between gap-8 relative z-10">
          <div>
            <div style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--teal-100)" }}>WELCOME BACK</div>
            <h1 className="mt-1" style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-xl)", color: "var(--teal-50)", lineHeight: 1.15 }}>Jane</h1>
            <p className="mt-3" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--teal-100)", lineHeight: 1.65 }}>
              Continue where you left off — <strong style={{ fontWeight: 700, color: "var(--teal-50)" }}>Anti-Harassment Training</strong>
              <span style={{ color: "var(--stone-400)" }}> · Module 3: Reporting Procedures</span>
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-5 rounded-lg px-6 py-3 relative"
              style={{ fontFamily: "var(--font-label)", fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: "var(--teal-400)", color: "var(--teal-50)" }}
            >
              <ColorLabel hex="#3A6870" role="PRIMARY (btn)" position="top-right" />
              Resume Course
            </motion.button>
          </div>
          <div className="text-right shrink-0">
            <div style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--teal-100)" }}>NEXT DEADLINE</div>
            <div className="mt-1" style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-stat-xl)", fontWeight: 700, color: "var(--teal-100)" }}>
              12 <span style={{ fontSize: "15px", fontWeight: 400 }}>days</span>
            </div>
            <div className="mt-0.5" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--stone-400)" }}>What is Dementia: Etiology and Treatment</div>
          </div>
        </div>
      </motion.div>

      {/* Main layout */}
      <div className="flex gap-10">
        <div className="flex-1 min-w-0">
          {/* Stat cards */}
          <motion.div className="grid grid-cols-4 gap-3 mb-8" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
            {[
              { label: "Training Hours", value: `${earnedCredits} / ${totalCredits}`, desc: "hours completed", color: "var(--teal-400)" },
              { label: "In Progress", value: inProgressCount, desc: "active courses", color: "var(--teal-400)" },
              { label: "Certificates", value: completedCount, desc: "earned", color: "var(--slate-400)" },
              { label: "Overdue", value: overdueCount, desc: overdueCount > 0 ? "needs attention" : "all on track", color: "var(--amber-600)" },
            ].map((stat, i) => (
              <div key={stat.label} className="group rounded-xl px-6 py-5 transition-shadow duration-300 hover:shadow-lg hover:shadow-black/[0.04] relative" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>
                {i === 0 && <ColorLabel hex="#E8EAE4" role="SURFACE (stat)" position="top-right" />}
                <div style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--text-muted)" }}>{stat.label}</div>
                <div className="mt-2 transition-transform duration-300 group-hover:translate-x-1" style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-stat-l)", fontWeight: 700, color: stat.color }}>{stat.value}</div>
                <div className="mt-1 transition-transform duration-300 group-hover:translate-x-1" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>{stat.desc}</div>
              </div>
            ))}
          </motion.div>

          {/* Learning Path header */}
          <div className="flex items-center justify-between mb-5">
            <h2 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-m)", color: "var(--text-primary)" }}>My Learning Path</h2>
            <button onClick={() => setShowCompleted(!showCompleted)} className="flex items-center gap-2">
              <div className="w-9 h-5 rounded-full relative transition-colors duration-200" style={{ backgroundColor: showCompleted ? "var(--teal-400)" : "var(--stone-200)" }}>
                <motion.div className="w-4 h-4 rounded-full absolute top-0.5" style={{ backgroundColor: "var(--bg-raised)" }} animate={{ left: showCompleted ? 18 : 2 }} transition={{ duration: 0.2 }} />
              </div>
              <span style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-muted)" }}>Show Completed ({completedCount})</span>
            </button>
          </div>

          {/* Course timeline */}
          <div className="relative">
            {displayedCourses.map((course, idx) => (
              <div key={course.id} className="relative">
                {idx === 0 && <ColorLabel hex="#FDFCFA" role="RAISED (card)" position="top-right" />}
                {idx === 0 && <ColorLabel hex="#CCD4CE" role="BORDER" position="bottom-right" />}
                <CourseTimelineCard
                  title={course.title} description={course.description} category={course.category}
                  duration={course.duration} credits={course.credits} creditsEarned={course.creditsEarned}
                  progress={course.progress} status={course.status} dueIn={course.dueIn}
                  currentModule={course.currentModule} color={course.color} index={idx}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Progress gauge */}
        <div className="w-[240px] shrink-0">
          <div className="sticky top-10">
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
              className="rounded-2xl px-6 py-8 relative" style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}>
              <ColorLabel hex="#FDFCFA" role="RAISED (gauge)" position="top-right" />
              <ProgressGauge percentage={percentage} completed={completedCount} total={totalCourses} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
    </ColorLabelProvider>
  );
}
