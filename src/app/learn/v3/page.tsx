"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ColorLabel, ColorLabelProvider } from "@/components/ui/color-label";

/**
 * V3 — Steel Slate & Cloud White (v1.1 — Deep Navy)
 * Lexora Academy LMS · Exact colour catalogue implementation
 *
 * 5 INPUT COLOURS: #0A1628 · #F5F8FA · #E7F0F7 · #E1EFFC · #647A93
 */

/* ── Colour Tokens (exact from catalogue) ── */
const T = {
  /* Deep Horizon scale */
  deep900:    "#0A1628",  // Obsidian — nav, sidebar, hero
  deep800:    "#0E1E30",
  deep600:    "#1A3050",
  deep400:    "#3A6080",
  deep200:    "#88A8C8",
  deep100:    "#C8D8E8",
  deep50:     "#EAF0F6",

  /* Steel Slate scale */
  slate900:   "#1A2838",
  slate800:   "#2A3D52",
  slate600:   "#445A73",
  slate400:   "#647A93",
  slate200:   "#A8BDD4",
  slate100:   "#D4E2EE",
  slate50:    "#EEF3F8",

  /* Sky Fill scale */
  sky900:     "#0E3268",
  sky800:     "#1A5290",
  sky600:     "#2E7EC0",
  sky400:     "#6AAEE8",
  sky200:     "#B8D8F8",
  sky100:     "#E1EFFC",
  sky50:      "#F4F9FF",

  /* Mist Neutral scale */
  mist50:     "#F5F8FA",
  mist100:    "#E7F0F7",
  mist200:    "#CCDDE8",
  mist400:    "#8AAAC0",
  mist600:    "#5A7A90",

  /* Semantic tokens */
  bgPage:     "#F5F8FA",
  bgSurface:  "#E7F0F7",
  bgRaised:   "#F5F8FA",
  bgHighlight:"#E1EFFC",
  bgObsidian: "#0A1628",

  textPrimary:"#1A2838",
  textBody:   "#223548",
  textMuted:  "#647A93",
  textHint:   "#8AAAC0",
  textLink:   "#2E7EC0",
  textOnDark: "#EAF0F6",   // NOT white — Rule 7
  textOnDarkMuted: "#88A8C8", // Rule 8
  textOnDarkHint:  "#3A6080",

  btnPrimary: "#0A1628",
  btnPrimaryHover: "#0E1E30",
  btnSky:     "#2E7EC0",
  btnDark:    "#0A1628",

  borderDefault: "#CCDDE8",
  borderStrong:  "#A8BDD4",
  borderAccent:  "#647A93",

  /* Urgency (recommended additions) */
  amberDark:  "#7A4E20",
  amber:      "#A06830",
  amberLight: "#D4A860",
  amberBg:    "#FAF0E8",
  redDark:    "#8A2820",
  red:        "#C04A40",
  redLight:   "#E8A098",
  redBg:      "#FFF0EE",
};

/* ── Status Styles (exact from catalogue) ── */
const statusStyles = {
  in_progress: { label: "IN PROGRESS", bg: T.slate50, text: T.slate600, border: T.slate100, dot: T.slate400 },
  completed:   { label: "COMPLETED",   bg: T.sky100,  text: T.sky800,  border: T.sky200,   dot: T.sky600 },
  overdue:     { label: "OVERDUE",     bg: T.redBg,   text: T.redDark, border: T.redLight,  dot: T.red },
  due_soon:    { label: "DUE SOON",    bg: T.amberBg, text: T.amberDark, border: T.amberLight, dot: T.amber },
  not_started: { label: "NOT STARTED", bg: T.mist100, text: T.textMuted, border: T.mist200, dot: T.mist400 },
};

type CourseStatus = keyof typeof statusStyles;

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
}

const mockCourses: Course[] = [
  { id: "1", title: "Anti-Harassment Training", description: "Comprehensive training on preventing workplace harassment, focusing on compliance with federal regulations and creating a respectful workplace.", category: "Compliance", duration: "8 minutes", credits: 2, creditsEarned: 0, progress: 65, status: "in_progress", dueIn: "Due in 20 days", currentModule: "Module 3: Reporting Procedures" },
  { id: "2", title: "What is Dementia: Etiology and Treatment", description: "Understanding dementia causes, symptoms, brain changes, and how to provide compassionate, effective care for residents.", category: "Clinical Skills", duration: "30 minutes", credits: 3, creditsEarned: 0, progress: 20, status: "in_progress", dueIn: "Due in 12 days", currentModule: "Drag and Drop: Symptoms vs Causes" },
  { id: "3", title: "HIPAA Privacy & Security", description: "Protecting patient health information, understanding privacy rules, and avoiding common HIPAA violations in daily workflows.", category: "Compliance", duration: "20 minutes", credits: 2, creditsEarned: 0, progress: 0, status: "overdue", dueIn: "3 days overdue" },
  { id: "4", title: "Facebook Expectations", description: "Social media guidelines for representing our facilities online with professionalism, compliance, and brand consistency.", category: "Policy", duration: "15 minutes", credits: 1, creditsEarned: 0, progress: 0, status: "not_started", dueIn: "Due in 30 days" },
  { id: "5", title: "Infection Control Annual Review", description: "Best practices for preventing infections, hand hygiene protocols, and PPE usage in senior care settings.", category: "Compliance", duration: "25 minutes", credits: 2, creditsEarned: 2, progress: 100, status: "completed" },
  { id: "6", title: "Fire Safety & Emergency Procedures", description: "Emergency evacuation procedures, fire extinguisher use, and life safety protocols for healthcare facilities.", category: "Safety", duration: "20 minutes", credits: 2, creditsEarned: 2, progress: 100, status: "completed" },
];

export default function LearnDashboardV3() {
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
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto relative" style={{ backgroundColor: T.bgPage }}>
      <ColorLabel hex={T.bgPage} role="PAGE BG (--mist-50)" position="top-left" />
      <div className="absolute top-8 left-2 z-50">
        <ColorLabel hex={T.bgRaised} role="RAISED (content)" position="top-left" />
      </div>

      {/* Colour legend */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { hex: "#F5F8FA", label: "PAGE BG" },
          { hex: "#E7F0F7", label: "SURFACE" },
          { hex: "#E1EFFC", label: "HIGHLIGHT" },
          { hex: "#0A1628", label: "OBSIDIAN" },
          { hex: "#647A93", label: "PRIMARY" },
          { hex: "#2E7EC0", label: "SKY" },
          { hex: "#A06830", label: "AMBER" },
          { hex: "#C04A40", label: "RED" },
          { hex: "#CCDDE8", label: "BORDER" },
        ].map(c => (
          <div key={c.hex} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1" style={{ border: `1px solid ${T.borderDefault}`, backgroundColor: T.bgRaised }}>
            <div className="w-3.5 h-3.5 rounded" style={{ backgroundColor: c.hex, border: `1px solid ${T.borderDefault}` }} />
            <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.12em", color: T.textPrimary, textTransform: "uppercase" }}>{c.label}</span>
            <span style={{ fontFamily: "monospace", fontSize: "9px", color: T.textMuted }}>{c.hex}</span>
          </div>
        ))}
      </div>

      {/* ═══ HERO BANNER — bg-obsidian #0A1628 ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl px-10 py-8 mb-8 relative overflow-hidden"
        style={{ backgroundColor: T.bgObsidian }}
      >
        <ColorLabel hex={T.bgObsidian} role="OBSIDIAN (hero)" position="top-right" />
        {/* Accent stripe */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: T.slate400 }} />
        <motion.div
          className="absolute inset-0 opacity-10"
          style={{ background: `radial-gradient(ellipse at 20% 50%, ${T.slate400}, transparent 60%), radial-gradient(ellipse at 80% 20%, ${T.deep200}, transparent 50%)` }}
          animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />
        <div className="flex items-center justify-between gap-8 relative z-10">
          <div>
            {/* Eyebrow: Forum 9px uppercase — Rule 7: #EAF0F6 not white */}
            <div style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: T.deep200 }}>
              WELCOME BACK
            </div>
            {/* Title: Instrument Serif italic 36px — #EAF0F6 on dark */}
            <h1 className="mt-1" style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-xl)", color: T.textOnDark, lineHeight: 1.15 }}>
              Jane
            </h1>
            {/* Body: Domine 15px — muted on dark #647A93 */}
            <p className="mt-3" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: T.textMuted, lineHeight: 1.65 }}>
              Continue where you left off — <strong style={{ fontWeight: 700, color: T.textOnDark }}>Anti-Harassment Training</strong>
              <span style={{ color: T.textOnDarkMuted }}> · Module 3: Reporting Procedures</span>
            </p>
            {/* CTA on dark: Forum 10px uppercase — bg #647A93 (pops on obsidian) */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-5 rounded-[5px] px-5 py-2.5 relative"
              style={{ fontFamily: "var(--font-label)", fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: T.slate400, color: T.slate50 }}
            >
              <ColorLabel hex={T.btnPrimary} role="PRIMARY (btn)" position="top-right" />
              Resume Course
            </motion.button>
          </div>
          <div className="text-right shrink-0">
            <div style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: T.deep200 }}>NEXT DEADLINE</div>
            {/* Badge: Domine 32px bold — #C8D8E8 on dark */}
            <div className="mt-1" style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-stat-xl)", fontWeight: 700, color: T.deep100 }}>
              12 <span style={{ fontSize: "15px", fontWeight: 400 }}>days</span>
            </div>
            <div className="mt-0.5" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: T.textOnDarkMuted }}>
              What is Dementia: Etiology and Treatment
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══ MAIN LAYOUT ═══ */}
      <div className="flex gap-10">
        <div className="flex-1 min-w-0">

          {/* ═══ STAT CARDS — bg surface #E7F0F7 ═══ */}
          <motion.div className="grid grid-cols-4 gap-3 mb-8" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
            {[
              { label: "Training Hours", value: `${earnedCredits} / ${totalCredits}`, desc: "hours completed", color: T.slate400 },
              { label: "In Progress", value: inProgressCount, desc: "active courses", color: T.slate400 },
              { label: "Certificates", value: completedCount, desc: "earned", color: T.sky600 },
              { label: "Overdue", value: overdueCount, desc: overdueCount > 0 ? "needs attention" : "all on track", color: T.red },
            ].map((stat, i) => (
              <div key={stat.label} className="group rounded-xl px-6 py-5 transition-shadow duration-300 hover:shadow-lg hover:shadow-black/[0.04] relative" style={{ backgroundColor: T.bgSurface, border: `1px solid ${T.borderDefault}` }}>
                {i === 0 && <ColorLabel hex={T.bgSurface} role="SURFACE (stat)" position="top-right" />}
                {/* Label: Forum 11px uppercase */}
                <div style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.22em", textTransform: "uppercase", color: T.textMuted }}>{stat.label}</div>
                {/* Value: Domine 26px bold — state colour */}
                <div className="mt-2 transition-transform duration-300 group-hover:translate-x-1" style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-stat-l)", fontWeight: 700, color: stat.color }}>{stat.value}</div>
                {/* Sub: Domine 12px */}
                <div className="mt-1 transition-transform duration-300 group-hover:translate-x-1" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: T.textMuted }}>{stat.desc}</div>
              </div>
            ))}
          </motion.div>

          {/* ═══ LEARNING PATH HEADER ═══ */}
          <div className="flex items-center justify-between mb-5">
            {/* Display M: Instrument Serif italic 22px — #1A2838 */}
            <h2 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-m)", color: T.textPrimary }}>My Learning Path</h2>
            <button onClick={() => setShowCompleted(!showCompleted)} className="flex items-center gap-2">
              <div className="w-9 h-5 rounded-full relative transition-colors duration-200" style={{ backgroundColor: showCompleted ? T.btnPrimary : T.borderDefault }}>
                <motion.div className="w-4 h-4 rounded-full absolute top-0.5" style={{ backgroundColor: "#FFFFFF" }} animate={{ left: showCompleted ? 18 : 2 }} transition={{ duration: 0.2 }} />
              </div>
              <span style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: T.textMuted }}>Show Completed ({completedCount})</span>
            </button>
          </div>

          {/* ═══ COURSE TIMELINE CARDS ═══ */}
          <div>
            {displayedCourses.map((course, idx) => {
              const st = statusStyles[course.status];
              const actionLabel = course.status === "completed" ? "VIEW CERTIFICATE" : course.status === "not_started" ? "START" : "CONTINUE";
              const actionBg = course.status === "completed" ? T.sky600 : T.btnPrimary;
              const actionText = course.status === "completed" ? T.sky50 : T.slate50;

              return (
                <motion.div
                  key={course.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ layout: { type: "spring", damping: 30, stiffness: 200, mass: 0.8 }, opacity: { duration: 0.35, delay: idx * 0.06 } }}
                  className="flex gap-5"
                >
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center shrink-0 w-8">
                    <div
                      className="w-4 h-4 rounded-full border-[3px] mt-6 shrink-0"
                      style={{
                        borderColor: st.dot,
                        backgroundColor: course.status === "in_progress" || course.status === "completed" ? st.dot : T.bgRaised,
                      }}
                    />
                    <div className="w-[2px] flex-1 mt-1" style={{ backgroundColor: T.borderDefault }} />
                  </div>

                  {/* Card — bg #F5F8FA, border #CCDDE8 */}
                  <div className="flex-1 rounded-2xl overflow-hidden mb-4 relative" style={{ backgroundColor: T.bgRaised, border: `0.5px solid ${T.borderDefault}` }}>
                    {idx === 0 && <ColorLabel hex={T.bgRaised} role="RAISED (card)" position="top-right" />}

                    <div className="p-6">
                      {/* Category + Status + Due */}
                      <div className="flex items-center gap-2 mb-2">
                        {/* Tag: Forum 10px uppercase */}
                        <span style={{ fontFamily: "var(--font-label)", fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: T.textMuted }}>
                          {course.category}
                        </span>
                        {/* Pill: Forum 10px uppercase — state colours */}
                        <span
                          className="rounded-full px-2.5 py-0.5"
                          style={{ fontFamily: "var(--font-label)", fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: st.bg, color: st.text, border: `1px solid ${st.border}` }}
                        >
                          {idx === 0 && <ColorLabel hex={st.bg} role="STATUS BG" position="top-left" />}
                          {st.label}
                        </span>
                        {course.dueIn && (
                          <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: course.status === "overdue" ? T.red : T.textMuted }}>
                            {course.dueIn}
                          </span>
                        )}
                      </div>

                      {/* Title: Domine 13px bold — #1A2838 */}
                      <h3 style={{ fontFamily: "var(--font-body)", fontSize: "17px", fontWeight: 700, color: T.textPrimary, lineHeight: 1.3 }}>
                        {course.title}
                      </h3>

                      {/* Description: Domine 12px — #2A3D52 */}
                      <p className="mt-1.5" style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: T.textBody, lineHeight: 1.65 }}>
                        {course.description}
                      </p>

                      {/* Current module: Domine 12px — #2E7EC0 (link colour) */}
                      {course.currentModule && course.status !== "completed" && (
                        <p className="mt-2" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: T.textLink }}>
                          Current: {course.currentModule}
                        </p>
                      )}

                      {/* Progress bar */}
                      {course.status !== "not_started" && course.status !== "completed" && (
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: T.mist100 }}>
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: st.dot }}
                              initial={{ width: 0 }}
                              animate={{ width: `${course.progress}%` }}
                              transition={{ duration: 0.8, delay: 0.2 + idx * 0.06, ease: [0.2, 0, 0, 1] }}
                            />
                          </div>
                          {/* Progress %: Domine 11px bold — state colour */}
                          <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", fontWeight: 700, color: st.dot }}>
                            {course.progress}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer — bg #E7F0F7 (surface) */}
                    <div className="flex items-center justify-between px-6 py-4 relative" style={{ borderTop: `1px solid ${T.borderDefault}`, backgroundColor: T.bgSurface }}>
                      {idx === 0 && <ColorLabel hex={T.bgSurface} role="SURFACE (footer)" position="bottom-left" />}
                      <div className="flex items-center gap-3">
                        <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: T.textMuted }}>{course.duration}</span>
                        <span style={{ color: T.borderDefault }}>·</span>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: T.textMuted }}>Credits earned: <strong style={{ fontWeight: 700, color: T.textPrimary }}>{course.creditsEarned}</strong></span>
                      </div>
                      <button
                        className="rounded-[5px] px-5 py-2.5 transition-colors duration-200"
                        style={{ fontFamily: "var(--font-label)", fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: actionBg, color: actionText }}
                      >
                        {actionLabel}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ═══ PROGRESS GAUGE (sticky) ═══ */}
        <div className="w-[240px] shrink-0">
          <div className="sticky top-10">
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="rounded-2xl px-6 py-8 relative"
              style={{ backgroundColor: T.bgRaised, border: `1px solid ${T.borderDefault}` }}
            >
              <ColorLabel hex={T.bgRaised} role="RAISED (gauge)" position="top-right" />

              {/* Gauge */}
              <div className="flex flex-col items-center">
                <svg width="200" height="110" viewBox="0 0 200 110">
                  <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={T.borderDefault} strokeWidth="16" strokeLinecap="round" />
                  <motion.path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke={T.sky600}
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray={Math.PI * 80}
                    initial={{ strokeDashoffset: Math.PI * 80 }}
                    animate={{ strokeDashoffset: Math.PI * 80 - (percentage / 100) * Math.PI * 80 }}
                    transition={{ duration: 1.2, ease: [0.2, 0, 0, 1], delay: 0.3 }}
                  />
                </svg>
                <div className="mt-[-8px] text-center">
                  {/* Stat L: Domine 26px bold — sky colour for completions */}
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-stat-l)", fontWeight: 700, color: T.sky600 }}>
                    {percentage}%
                  </span>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: T.textBody, marginTop: "2px" }}>of goal</div>
                </div>
                <p className="mt-3 text-center max-w-[200px]" style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: T.textMuted, lineHeight: 1.65 }}>
                  You&apos;ve completed <strong style={{ color: T.textPrimary, fontWeight: 700 }}>{completedCount}</strong> of your{" "}
                  <strong style={{ color: T.textPrimary, fontWeight: 700 }}>{totalCourses}</strong> courses.
                  {totalCourses - completedCount > 0 && (
                    <> Only <strong style={{ color: T.sky600, fontWeight: 700 }}>{totalCourses - completedCount}</strong> to go!</>
                  )}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
    </ColorLabelProvider>
  );
}
