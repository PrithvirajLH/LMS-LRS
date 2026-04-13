"use client";

import { useState, useMemo } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { CatalogCard } from "@/components/catalog/catalog-card";
import type { EnrollStatus } from "@/components/catalog/catalog-card";

interface CatalogCourse {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  credits: number;
  modules: number;
  enrollStatus: EnrollStatus;
  accreditation?: string;
  color: string;
}

const categories = ["All", "Compliance", "Clinical Skills", "Safety", "Policy", "Wellness"];

const allCourses: CatalogCourse[] = [
  {
    id: "dementia",
    title: "What is Dementia: Etiology and Treatment",
    description: "Understanding dementia causes, symptoms, brain changes, and how to provide compassionate, effective care for residents.",
    category: "Clinical Skills",
    duration: "30 min",
    credits: 3,
    modules: 14,
    enrollStatus: "enrolled",
    accreditation: "ANCC",
    color: "from-[#2A3D52] to-[#647A93]",
  },
  {
    id: "facebook",
    title: "Facebook Expectations",
    description: "Social media guidelines for representing our facilities online with professionalism, compliance, and brand consistency.",
    category: "Policy",
    duration: "15 min",
    credits: 1,
    modules: 8,
    enrollStatus: "enrolled",
    color: "from-[#445A73] to-[#A8BDD4]",
  },
  {
    id: "hipaa",
    title: "HIPAA Privacy & Security",
    description: "Protecting patient health information, understanding privacy rules, and avoiding common HIPAA violations in daily workflows.",
    category: "Compliance",
    duration: "20 min",
    credits: 2,
    modules: 6,
    enrollStatus: "enrolled",
    accreditation: "CMS",
    color: "from-[#445A73] to-[#647A93]",
  },
  {
    id: "harassment",
    title: "Anti-Harassment Training",
    description: "Comprehensive training on preventing workplace harassment, focusing on compliance with federal regulations and creating a respectful workplace.",
    category: "Compliance",
    duration: "8 min",
    credits: 2,
    modules: 4,
    enrollStatus: "enrolled",
    color: "from-[#2A3D52] to-[#A8BDD4]",
  },
  {
    id: "infection",
    title: "Infection Control Annual Review",
    description: "Best practices for preventing infections, hand hygiene protocols, and PPE usage in senior care settings.",
    category: "Compliance",
    duration: "25 min",
    credits: 2,
    modules: 8,
    enrollStatus: "completed",
    accreditation: "CMS",
    color: "from-[#445A73] to-[#A8BDD4]",
  },
  {
    id: "fire-safety",
    title: "Fire Safety & Emergency Procedures",
    description: "Emergency evacuation procedures, fire extinguisher use, and life safety protocols for healthcare facilities.",
    category: "Safety",
    duration: "20 min",
    credits: 2,
    modules: 6,
    enrollStatus: "completed",
    color: "from-[#445A73] to-[#647A93]",
  },
  {
    id: "abuse",
    title: "Abuse & Neglect Prevention",
    description: "Recognizing signs of abuse and neglect, mandatory reporting requirements, and creating a safe environment for all residents.",
    category: "Compliance",
    duration: "45 min",
    credits: 3,
    modules: 10,
    enrollStatus: "available",
    accreditation: "CMS",
    color: "from-[#2A3D52] to-[#647A93]",
  },
  {
    id: "bloodborne",
    title: "Bloodborne Pathogens",
    description: "OSHA requirements for exposure control, safe handling of sharps, and post-exposure procedures in healthcare settings.",
    category: "Safety",
    duration: "20 min",
    credits: 2,
    modules: 5,
    enrollStatus: "available",
    accreditation: "OSHA",
    color: "from-[#445A73] to-[#A8BDD4]",
  },
  {
    id: "resident-rights",
    title: "Resident Rights",
    description: "Understanding and upholding the rights of residents in long-term care, including dignity, privacy, and autonomy.",
    category: "Compliance",
    duration: "30 min",
    credits: 2,
    modules: 7,
    enrollStatus: "available",
    accreditation: "CMS",
    color: "from-[#2A3D52] to-[#A8BDD4]",
  },
  {
    id: "falls",
    title: "Fall Prevention & Management",
    description: "Evidence-based strategies for reducing fall risk, post-fall assessment protocols, and environmental safety modifications.",
    category: "Clinical Skills",
    duration: "35 min",
    credits: 3,
    modules: 9,
    enrollStatus: "available",
    accreditation: "ANCC",
    color: "from-[#445A73] to-[#647A93]",
  },
  {
    id: "stress",
    title: "Stress Management for Caregivers",
    description: "Practical techniques for managing stress, avoiding burnout, and maintaining personal wellbeing in demanding healthcare roles.",
    category: "Wellness",
    duration: "15 min",
    credits: 1,
    modules: 4,
    enrollStatus: "available",
    color: "from-[#2A3D52] to-[#647A93]",
  },
  {
    id: "medication",
    title: "Medication Administration Safety",
    description: "Best practices for safe medication administration, common errors, and the five rights of medication management.",
    category: "Clinical Skills",
    duration: "40 min",
    credits: 3,
    modules: 12,
    enrollStatus: "available",
    accreditation: "ANCC",
    color: "from-[#445A73] to-[#A8BDD4]",
  },
];

export default function CourseCatalog() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [courses, setCourses] = useState(allCourses);

  const filtered = useMemo(() => {
    let result = courses;

    if (activeCategory !== "All") {
      result = result.filter((c) => c.category === activeCategory);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
      );
    }

    return result;
  }, [courses, activeCategory, search]);

  const handleEnroll = (id: string) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enrollStatus: "enrolled" as EnrollStatus } : c))
    );
  };

  const enrolledCount = courses.filter((c) => c.enrollStatus === "enrolled").length;
  const availableCount = courses.filter((c) => c.enrollStatus === "available").length;

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
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
          Course Catalog
        </h1>
        <p
          className="mt-2"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "15px",
            color: "var(--text-body)",
          }}
        >
          {availableCount} courses available to enroll · {enrolledCount} enrolled
        </p>
      </motion.div>

      {/* Search + Category filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mt-6 mb-8"
      >
        {/* Search bar */}
        <div className="relative mb-5">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2"
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses by name, topic, or category..."
            className="w-full pl-11 pr-4 py-3.5 rounded-xl outline-none transition-all duration-200"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "14px",
              color: "var(--text-primary)",
              backgroundColor: "var(--bg-raised)",
              border: "1px solid var(--border-default)",
            }}
          />
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {categories.map((cat) => {
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="relative rounded-full px-4 py-2 transition-colors duration-200"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "12px",
                  fontWeight: 600,
                  backgroundColor: active ? "var(--btn-primary)" : "var(--bg-raised)",
                  color: active ? "var(--deep-50)" : "var(--text-muted)",
                  border: active ? "1px solid var(--btn-primary)" : "1px solid var(--border-default)",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Course grid */}
      <LayoutGroup>
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {filtered.map((course, idx) => (
              <CatalogCard
                key={course.id}
                id={course.id}
                title={course.title}
                description={course.description}
                category={course.category}
                duration={course.duration}
                credits={course.credits}
                modules={course.modules}
                enrollStatus={course.enrollStatus}
                accreditation={course.accreditation}
                color={course.color}
                index={idx}
                onEnroll={handleEnroll}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div
          className="text-center py-16"
          style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-muted)" }}
        >
          No courses match your search.
        </div>
      )}

      {/* Count */}
      <div
        className="mt-6 text-right"
        style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}
      >
        Showing {filtered.length} of {courses.length} courses
      </div>
    </div>
  );
}
