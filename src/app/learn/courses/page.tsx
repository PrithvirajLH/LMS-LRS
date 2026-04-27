"use client";

import { useState, useMemo, useEffect } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { CatalogCard } from "@/components/catalog/catalog-card";
import type { EnrollStatus } from "@/components/catalog/catalog-card";

interface CatalogCourse {
  id: string; title: string; description: string; category: string; duration: string;
  credits: number; modules: number; enrollStatus: EnrollStatus; accreditation?: string; color: string;
  thumbnailUrl?: string;
}

const categories = ["All", "Compliance", "Clinical Skills", "Safety", "Policy", "Wellness"];

export default function CourseCatalog() {
  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    fetch("/api/learner/courses")
      .then((r) => r.json())
      .then((data) => {
        if (data.courses) {
          setCourses(data.courses.map((c: { id: string; title: string; description: string; category: string; duration: string; credits: number; modules: number; enrollStatus: string; accreditation: string; color: string; thumbnailUrl?: string }) => ({
            ...c,
            enrollStatus: (c.enrollStatus || "available") as EnrollStatus,
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = courses;
    if (activeCategory !== "All") result = result.filter((c) => c.category === activeCategory);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
    }
    return result;
  }, [courses, activeCategory, search]);

  const handleEnroll = async (id: string) => {
    try {
      const res = await fetch("/api/learner/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: id }),
      });

      if (res.ok) {
        setCourses((prev) => prev.map((c) => c.id === id ? { ...c, enrollStatus: "enrolled" as EnrollStatus } : c));
      }
    } catch {
      // Silent fail
    }
  };

  if (loading) {
    return <div className="p-6 md:p-10 max-w-[1200px] mx-auto"><div className="animate-pulse h-8 w-48 rounded" style={{ backgroundColor: "var(--bg-surface)" }} /></div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-l)", color: "var(--text-primary)" }}>Course Catalog</h1>
        <p className="mt-2" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-body)" }}>
          {courses.length > 0 ? (() => {
            const available = courses.filter((c) => c.enrollStatus === "available").length;
            // Anything the learner has already started or finished counts as "yours"
            const myCourses = courses.filter((c) =>
              c.enrollStatus === "enrolled" ||
              c.enrollStatus === "in_progress" ||
              c.enrollStatus === "completed"
            ).length;
            const parts = [`${courses.length} total`];
            if (available > 0) parts.push(`${available} available`);
            if (myCourses > 0) parts.push(`${myCourses} ${myCourses === 1 ? "yours" : "yours"}`);
            return parts.join(" · ");
          })() : "No published courses yet."}
        </p>
      </div>

      {courses.length > 0 && (
        <>
          <div className="mt-6 mb-8">
            <div className="relative mb-5">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses..." className="w-full pl-11 pr-4 py-3.5 rounded-xl outline-none" style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-primary)", backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {categories.map((cat) => (
                <button key={cat} onClick={() => setActiveCategory(cat)} className="rounded-full px-4 py-2 transition-colors duration-200" style={{ fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 600, backgroundColor: activeCategory === cat ? "var(--btn-primary)" : "var(--bg-raised)", color: activeCategory === cat ? "var(--deep-50)" : "var(--text-muted)", border: activeCategory === cat ? "1px solid var(--btn-primary)" : "1px solid var(--border-default)" }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <LayoutGroup>
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {filtered.map((course, idx) => (
                  <CatalogCard key={course.id} {...course} index={idx} onEnroll={handleEnroll} />
                ))}
              </AnimatePresence>
            </motion.div>
          </LayoutGroup>
        </>
      )}

      {filtered.length === 0 && !loading && courses.length > 0 && (
        <div className="text-center py-16" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-muted)" }}>No courses match your search.</div>
      )}
    </div>
  );
}
