"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ColorLabel, ColorLabelProvider } from "@/components/ui/color-label";

/**
 * COLOR MAP — Colleague's palette
 *
 * #F5F8FA  → PAGE BG        (lightest — outer background)
 * #E7F0F7  → SURFACE        (cards, stat panels, sidebar)
 * #E1EFFC  → HIGHLIGHT      (active states, selected pills, hover fills)
 * #647A93  → PRIMARY        (buttons, headings, active text, icons)
 *
 * Derived:
 * #4A6178  → PRIMARY DARK   (hover on buttons, strong text)
 * #8DA0B5  → MUTED          (secondary text, placeholders)
 * #B8CAD9  → BORDER         (card borders, dividers)
 * #FFFFFF  → RAISED         (card backgrounds on surface)
 * #1E3A52  → DEEP           (welcome strip dark background)
 */

// Mock data
const mockCourses = [
  { id: "1", title: "Anti-Harassment Training", category: "Compliance", duration: "8 min", credits: 2, progress: 65, status: "in_progress" as const, dueIn: "Due in 20 days", currentModule: "Module 3: Reporting Procedures" },
  { id: "2", title: "What is Dementia: Etiology and Treatment", category: "Clinical Skills", duration: "30 min", credits: 3, progress: 20, status: "in_progress" as const, dueIn: "Due in 12 days", currentModule: "Drag and Drop: Symptoms vs Causes" },
  { id: "3", title: "HIPAA Privacy & Security", category: "Compliance", duration: "20 min", credits: 2, progress: 0, status: "overdue" as const, dueIn: "3 days overdue" },
  { id: "4", title: "Facebook Expectations", category: "Policy", duration: "15 min", credits: 1, progress: 0, status: "not_started" as const, dueIn: "Due in 30 days" },
  { id: "5", title: "Infection Control Annual Review", category: "Compliance", duration: "25 min", credits: 2, progress: 100, status: "completed" as const },
  { id: "6", title: "Fire Safety & Emergency Procedures", category: "Safety", duration: "20 min", credits: 2, progress: 100, status: "completed" as const },
];

const C = {
  pageBg:     "#F5F8FA",   // PAGE BG
  surface:    "#E7F0F7",   // SURFACE
  highlight:  "#E1EFFC",   // HIGHLIGHT
  primary:    "#647A93",   // PRIMARY
  primaryDk:  "#4A6178",   // PRIMARY DARK
  muted:      "#8DA0B5",   // MUTED
  border:     "#B8CAD9",   // BORDER
  raised:     "#FFFFFF",   // RAISED (cards)
  deep:       "#1E3A52",   // DEEP (dark banner)
  deepLight:  "#C8D8E8",   // text on deep
  text:       "#2C3E50",   // HEADINGS
  body:       "#5A6D80",   // BODY TEXT
  danger:     "#B85C3A",   // OVERDUE (warm contrast)
};

const statusStyles = {
  in_progress: { label: "IN PROGRESS", bg: C.highlight, text: C.primary, dot: C.primary },
  completed:   { label: "COMPLETED",   bg: "#E8F0E8", text: "#4A7A5A", dot: "#4A7A5A" },
  overdue:     { label: "OVERDUE",     bg: "#FAF0EC", text: C.danger, dot: C.danger },
  not_started: { label: "NOT STARTED", bg: C.surface, text: C.muted, dot: C.border },
  due_soon:    { label: "DUE SOON",    bg: "#FAF0EC", text: C.danger, dot: C.danger },
};

export default function V3Dashboard() {
  const [showCompleted, setShowCompleted] = useState(false);
  const active = mockCourses.filter(c => c.status !== "completed");
  const completed = mockCourses.filter(c => c.status === "completed");
  const displayed = showCompleted ? mockCourses : active;

  return (
    <ColorLabelProvider>
    <div style={{ backgroundColor: C.pageBg, minHeight: "100%" }} className="p-6 md:p-10 max-w-[1200px] mx-auto relative">
      <ColorLabel hex={C.pageBg} role="PAGE BG (outer)" position="top-left" />
      <div className="absolute top-8 left-2 z-50">
        <ColorLabel hex={C.raised} role="RAISED (content area)" position="top-left" />
      </div>

      {/* Color legend */}
      <div className="mb-6 flex flex-wrap gap-3">
        {[
          { hex: "#F5F8FA", label: "PAGE BG" },
          { hex: "#E7F0F7", label: "SURFACE" },
          { hex: "#E1EFFC", label: "HIGHLIGHT" },
          { hex: "#647A93", label: "PRIMARY" },
        ].map(c => (
          <div key={c.hex} className="flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ border: `1px solid ${C.border}`, backgroundColor: C.raised }}>
            <div className="w-4 h-4 rounded" style={{ backgroundColor: c.hex, border: `1px solid ${C.border}` }} />
            <span style={{ fontFamily: "var(--font-label)", fontSize: "10px", letterSpacing: "0.12em", color: C.primary, textTransform: "uppercase" }}>{c.label}</span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: C.muted }}>{c.hex}</span>
          </div>
        ))}
      </div>

      {/* Welcome strip — uses DEEP bg */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl px-10 py-8 mb-8 relative overflow-hidden"
        style={{ backgroundColor: C.deep }}
      >
        <ColorLabel hex={C.deep} role="DEEP (banner)" position="top-right" />
        <motion.div
          className="absolute inset-0 opacity-15"
          style={{ background: `radial-gradient(ellipse at 20% 50%, ${C.primary}, transparent 60%), radial-gradient(ellipse at 80% 20%, ${C.border}, transparent 50%)` }}
          animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />
        <div className="flex items-center justify-between gap-8 relative z-10">
          <div>
            <div style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: C.deepLight }}>
              WELCOME BACK
            </div>
            <h1 className="mt-1" style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-xl)", color: "#FFFFFF", lineHeight: 1.15 }}>
              Jane
            </h1>
            <p className="mt-3" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: C.deepLight, lineHeight: 1.65 }}>
              Continue where you left off — <strong style={{ fontWeight: 700, color: "#FFFFFF" }}>Anti-Harassment Training</strong>
              <span style={{ color: C.muted }}> · Module 3: Reporting Procedures</span>
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-5 rounded-lg px-6 py-3 relative"
              style={{ fontFamily: "var(--font-label)", fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: C.primary, color: "#FFFFFF" }}
            >
              <ColorLabel hex={C.primary} role="PRIMARY (btn)" position="top-right" />
              Resume Course
            </motion.button>
          </div>
          <div className="text-right shrink-0">
            <div style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: C.deepLight }}>NEXT DEADLINE</div>
            <div className="mt-1" style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-stat-xl)", fontWeight: 700, color: C.deepLight }}>
              12 <span style={{ fontSize: "15px", fontWeight: 400 }}>days</span>
            </div>
            <div className="mt-0.5" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: C.muted }}>
              What is Dementia: Etiology and Treatment
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main layout: timeline left, gauge right */}
      <div className="flex gap-10">
      <div className="flex-1 min-w-0">

      {/* Stat cards — uses SURFACE bg */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: "Training Hours", value: "4 / 12", color: C.primary },
          { label: "In Progress", value: "2", color: C.primary },
          { label: "Certificates", value: "2", color: "#4A7A5A" },
          { label: "Overdue", value: "1", color: C.danger },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="group rounded-xl px-6 py-5 transition-shadow duration-300 hover:shadow-lg hover:shadow-black/[0.04] relative"
            style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
          >
            {i === 0 && <ColorLabel hex={C.surface} role="SURFACE (cards)" position="top-right" />}
            <div style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted }}>{stat.label}</div>
            <div className="mt-2 transition-transform duration-300 group-hover:translate-x-1" style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-stat-l)", fontWeight: 700, color: stat.color }}>{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Learning Path header */}
      <div className="flex items-center justify-between mb-5">
        <h2 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-m)", color: C.text }}>
          My Learning Path
        </h2>
        <button onClick={() => setShowCompleted(!showCompleted)} className="flex items-center gap-2">
          <div className="w-9 h-5 rounded-full relative transition-colors duration-200" style={{ backgroundColor: showCompleted ? C.primary : C.border }}>
            <motion.div className="w-4 h-4 rounded-full absolute top-0.5" style={{ backgroundColor: C.raised }} animate={{ left: showCompleted ? 18 : 2 }} transition={{ duration: 0.2 }} />
          </div>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: C.muted }}>Show Completed ({completed.length})</span>
        </button>
      </div>

      {/* Course cards — uses RAISED bg with SURFACE footer */}
      <div className="space-y-4">
        {displayed.map((course, idx) => {
          const st = statusStyles[course.status];
          const actionLabel = course.status === "completed" ? "VIEW CERTIFICATE" : course.status === "not_started" ? "START" : "CONTINUE";
          return (
            <motion.div
              key={course.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ layout: { type: "spring", damping: 30, stiffness: 200 }, opacity: { duration: 0.35, delay: idx * 0.06 } }}
              className="flex gap-5"
            >
              {/* Timeline dot */}
              <div className="flex flex-col items-center shrink-0 w-8">
                <div className="w-4 h-4 rounded-full border-[3px] mt-6 shrink-0" style={{ borderColor: st.dot, backgroundColor: course.status === "in_progress" || course.status === "completed" ? st.dot : C.raised }} />
                <div className="w-[2px] flex-1 mt-1" style={{ backgroundColor: C.border }} />
              </div>

              {/* Card — RAISED bg */}
              <div className="flex-1 rounded-2xl overflow-hidden mb-2 relative" style={{ backgroundColor: C.raised, border: `1px solid ${C.border}` }}>
                {idx === 0 && <ColorLabel hex={C.raised} role="RAISED (card bg)" position="top-right" />}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ fontFamily: "var(--font-label)", fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: C.muted }}>{course.category}</span>
                    <span className="rounded-full px-2.5 py-0.5 relative" style={{ fontFamily: "var(--font-label)", fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: st.bg, color: st.text }}>
                      {idx === 0 && <ColorLabel hex={C.highlight} role="HIGHLIGHT (pill)" position="top-left" />}
                      {st.label}
                    </span>
                    {course.dueIn && <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: course.status === "overdue" ? C.danger : C.muted }}>{course.dueIn}</span>}
                  </div>
                  <h3 style={{ fontFamily: "var(--font-body)", fontSize: "17px", fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{course.title}</h3>
                  {course.currentModule && <p className="mt-2" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: C.primary }}>Current: {course.currentModule}</p>}
                  {course.status !== "not_started" && course.status !== "completed" && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: C.surface }}>
                        <motion.div className="h-full rounded-full" style={{ backgroundColor: st.dot }} initial={{ width: 0 }} animate={{ width: `${course.progress}%` }} transition={{ duration: 0.8, delay: 0.2 }} />
                      </div>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 700, color: st.dot }}>{course.progress}%</span>
                    </div>
                  )}
                </div>
                {/* Footer — SURFACE bg */}
                <div className="flex items-center justify-between px-6 py-4 relative" style={{ borderTop: `1px solid ${C.border}`, backgroundColor: C.surface }}>
                  {idx === 0 && <ColorLabel hex={C.surface} role="SURFACE (footer)" position="bottom-left" />}
                  <div className="flex items-center gap-3">
                    <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: C.muted }}>{course.duration}</span>
                    <span style={{ color: C.border }}>·</span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: C.muted }}>{course.credits} credits</span>
                  </div>
                  <button className="rounded-lg px-5 py-2.5" style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: course.status === "completed" ? "#4A7A5A" : C.primary, color: "#FFFFFF" }}>
                    {actionLabel}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      </div>{/* end left column */}

      {/* Right column: progress gauge (sticky) */}
      <div className="w-[240px] shrink-0">
        <div className="sticky top-10">
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="rounded-2xl px-6 py-8 relative"
            style={{ backgroundColor: C.raised, border: `1px solid ${C.border}` }}
          >
            <ColorLabel hex={C.raised} role="RAISED (gauge)" position="top-right" />
            {/* Gauge SVG */}
            <div className="flex flex-col items-center">
              <svg width="200" height="110" viewBox="0 0 200 110">
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={C.border} strokeWidth="16" strokeLinecap="round" />
                <motion.path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke={C.primary}
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray={Math.PI * 80}
                  initial={{ strokeDashoffset: Math.PI * 80 }}
                  animate={{ strokeDashoffset: Math.PI * 80 - (33 / 100) * Math.PI * 80 }}
                  transition={{ duration: 1.2, ease: [0.2, 0, 0, 1], delay: 0.3 }}
                />
              </svg>
              <div className="mt-[-8px] text-center">
                <span style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-stat-l)", fontWeight: 700, color: C.primary }}>33%</span>
                <div style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: C.body, marginTop: "2px" }}>of goal</div>
              </div>
              <p className="mt-3 text-center max-w-[200px]" style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: C.muted, lineHeight: 1.65 }}>
                You&apos;ve completed <strong style={{ color: C.text, fontWeight: 700 }}>2</strong> of your <strong style={{ color: C.text, fontWeight: 700 }}>6</strong> courses. Only <strong style={{ color: C.primary, fontWeight: 700 }}>4</strong> to go!
              </p>
            </div>
          </motion.div>
        </div>
      </div>
      </div>{/* end flex row */}
    </div>
    </ColorLabelProvider>
  );
}
