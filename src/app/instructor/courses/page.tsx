"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconUpload, IconExternalLink, IconEye, IconWorldUp, IconWorldOff, IconTrash } from "@tabler/icons-react";

interface Course {
  rowKey: string;
  title: string;
  description: string;
  category: string;
  activityId: string;
  credits: number;
  duration: string;
  accreditation: string;
  moduleCount: number;
  status: string;
  launchUrl: string;
  createdAt: string;
  publishedAt: string;
}

export default function ManageCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  async function loadCourses() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/courses");
      const data = await res.json();
      setCourses(data.courses || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  useEffect(() => { loadCourses(); }, []);

  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    setDeleteTarget(null);
    try {
      const res = await fetch(`/api/admin/courses?courseId=${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.error) loadCourses();
    } catch { /* silently fail */ }
    setDeleting(null);
  }

  async function toggleStatus(courseId: string, currentStatus: string) {
    const newStatus = currentStatus === "published" ? "draft" : "published";
    await fetch("/api/admin/courses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, status: newStatus }),
    });
    loadCourses();
  }

  const filtered = filter === "all" ? courses : courses.filter((c) => c.status === filter);

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-l)", color: "var(--text-primary)" }}>
            Manage Courses
          </h1>
          <p className="mt-2" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-body)" }}>
            {courses.length} course{courses.length !== 1 ? "s" : ""} uploaded
          </p>
        </div>
        <Link
          href="/instructor/courses/upload"
          className="flex items-center gap-2 rounded-[5px] px-5 py-2.5"
          style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: "var(--btn-primary)", color: "var(--teal-50)" }}
        >
          <IconUpload size={14} />
          Upload New
        </Link>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 mt-6 mb-6">
        {(["all", "published", "draft"] as const).map((f) => {
          const count = f === "all" ? courses.length : courses.filter((c) => c.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="rounded-full px-4 py-2 transition-colors duration-200"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "12px",
                fontWeight: 600,
                backgroundColor: filter === f ? "var(--btn-primary)" : "var(--bg-raised)",
                color: filter === f ? "var(--deep-50)" : "var(--text-muted)",
                border: filter === f ? "1px solid var(--btn-primary)" : "1px solid var(--border-default)",
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} {count}
            </button>
          );
        })}
      </div>

      {/* Course table */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}>
        {loading ? (
          <div className="p-12 text-center" style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-muted)" }}>Loading courses...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-muted)" }}>No courses yet.</p>
            <Link
              href="/instructor/courses/upload"
              className="inline-flex items-center gap-2 mt-4 rounded-[5px] px-5 py-2.5"
              style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: "var(--btn-primary)", color: "var(--teal-50)" }}
            >
              <IconUpload size={14} />
              Upload Your First Course
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-default)", backgroundColor: "var(--bg-surface)" }}>
                {["Course", "Category", "Credits", "Modules", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3"
                    style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((course) => (
                <tr key={course.rowKey} className="hover:bg-[var(--teal-50)] transition-colors duration-150" style={{ borderBottom: "1px solid var(--border-default)" }}>
                  <td className="px-5 py-4">
                    <div style={{ fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{course.title}</div>
                    <div className="mt-0.5" style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--text-muted)" }}>
                      {course.duration}{course.accreditation ? ` · ${course.accreditation}` : ""}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className="rounded-full px-2.5 py-0.5"
                      style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: "var(--bg-surface)", color: "var(--text-muted)" }}
                    >
                      {course.category}
                    </span>
                  </td>
                  <td className="px-5 py-4" style={{ fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
                    {course.credits}
                  </td>
                  <td className="px-5 py-4" style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-body)" }}>
                    {course.moduleCount}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className="rounded-full px-2.5 py-0.5"
                      style={{
                        fontFamily: "var(--font-label)",
                        fontSize: "9px",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        backgroundColor: course.status === "published" ? "#E8F0E8" : "var(--stone-100)",
                        color: course.status === "published" ? "#3A6A5A" : "var(--text-muted)",
                      }}
                    >
                      {course.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <a
                        href={course.launchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-2 transition-colors duration-150 hover:bg-[var(--bg-surface)]"
                        title="Preview"
                      >
                        <IconEye size={16} style={{ color: "var(--text-muted)" }} />
                      </a>
                      <button
                        onClick={() => toggleStatus(course.rowKey, course.status)}
                        className="rounded-lg p-2 transition-colors duration-150 hover:bg-[var(--bg-surface)]"
                        title={course.status === "published" ? "Unpublish" : "Publish"}
                      >
                        {course.status === "published" ? (
                          <IconWorldOff size={16} style={{ color: "var(--amber-600)" }} />
                        ) : (
                          <IconWorldUp size={16} style={{ color: "#3A6A5A" }} />
                        )}
                      </button>
                      <a
                        href={`/play?courseId=${course.rowKey}`}
                        className="rounded-lg p-2 transition-colors duration-150 hover:bg-[var(--bg-surface)]"
                        title="Launch"
                      >
                        <IconExternalLink size={16} style={{ color: "var(--text-muted)" }} />
                      </a>
                      <button
                        onClick={() => setDeleteTarget({ id: course.rowKey, title: course.title })}
                        disabled={deleting === course.rowKey}
                        className="rounded-lg p-2 transition-colors duration-150 hover:bg-red-50"
                        title="Delete course"
                      >
                        {deleting === course.rowKey ? (
                          <div className="w-4 h-4 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <IconTrash size={16} style={{ color: "var(--amber-600)" }} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setDeleteTarget(null)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          {/* Modal */}
          <div
            className="relative rounded-2xl p-8 w-full max-w-md shadow-2xl"
            style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
              style={{ backgroundColor: "rgba(192, 74, 64, 0.1)" }}
            >
              <IconTrash size={22} style={{ color: "#C04A40" }} stroke={1.5} />
            </div>

            {/* Title */}
            <h3 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "20px", color: "var(--text-primary)" }}>
              Delete Course
            </h3>

            {/* Course name */}
            <p className="mt-2" style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-body)" }}>
              Are you sure you want to delete <strong>{deleteTarget.title}</strong>?
            </p>

            {/* Warning */}
            <div
              className="mt-4 rounded-xl p-4"
              style={{ backgroundColor: "rgba(192, 74, 64, 0.06)", border: "1px solid rgba(192, 74, 64, 0.15)" }}
            >
              <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "#C04A40", lineHeight: 1.6 }}>
                This will permanently remove all course files from storage and all learner enrollments. This action cannot be undone.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-[5px] px-5 py-2.5 transition-colors duration-150"
                style={{
                  fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase",
                  backgroundColor: "var(--bg-surface)", color: "var(--text-body)", border: "1px solid var(--border-default)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-[5px] px-5 py-2.5 transition-colors duration-150 hover:opacity-90"
                style={{
                  fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase",
                  backgroundColor: "#C04A40", color: "#fff",
                }}
              >
                Delete Course
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
