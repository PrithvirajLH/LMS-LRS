"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconUpload, IconExternalLink, IconEye, IconWorldUp, IconWorldOff, IconTrash, IconAdjustments, IconPhoto, IconPhotoUp, IconX } from "@tabler/icons-react";

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
  hasAssessment?: boolean;
  passingScore?: number;
  validityPeriodMonths?: number;
  thumbnailUrl?: string;
}

interface PolicyDraft {
  hasAssessment: boolean;
  // null means "use organization default"
  passingScorePct: number | null;
  // CE credit validity in months. 0 = never expires.
  validityPeriodMonths: number;
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

  // Policy editor state
  const [policyTarget, setPolicyTarget] = useState<Course | null>(null);
  const [policyDraft, setPolicyDraft] = useState<PolicyDraft | null>(null);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [orgDefaultPct, setOrgDefaultPct] = useState<number>(80);

  // Thumbnail upload state
  const [thumbnailTarget, setThumbnailTarget] = useState<Course | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  function openThumbnailModal(course: Course) {
    setThumbnailTarget(course);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setThumbnailError(null);
  }

  function closeThumbnailModal() {
    setThumbnailTarget(null);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setThumbnailError(null);
    setUploadingThumbnail(false);
    setIsDragging(false);
  }

  function handleThumbnailFile(file: File | null) {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setThumbnailError("File must be a JPEG, PNG, or WebP image");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setThumbnailError(`File too large (${Math.round(file.size / 1024)}KB). Maximum is 2MB.`);
      return;
    }
    setThumbnailError(null);
    setThumbnailFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setThumbnailPreview(typeof e.target?.result === "string" ? e.target.result : null);
    reader.readAsDataURL(file);
  }

  async function uploadThumbnail() {
    if (!thumbnailTarget || !thumbnailFile) return;
    setUploadingThumbnail(true);
    setThumbnailError(null);
    try {
      const fd = new FormData();
      fd.append("courseId", thumbnailTarget.rowKey);
      fd.append("file", thumbnailFile);
      const res = await fetch("/api/admin/courses/thumbnail", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || data.error) {
        setThumbnailError(data.message || "Upload failed");
        setUploadingThumbnail(false);
        return;
      }
      closeThumbnailModal();
      loadCourses();
    } catch {
      setThumbnailError("Upload failed");
      setUploadingThumbnail(false);
    }
  }

  async function removeThumbnail() {
    if (!thumbnailTarget) return;
    setUploadingThumbnail(true);
    try {
      await fetch(`/api/admin/courses/thumbnail?courseId=${encodeURIComponent(thumbnailTarget.rowKey)}`, {
        method: "DELETE",
      });
      closeThumbnailModal();
      loadCourses();
    } catch {
      setThumbnailError("Failed to remove thumbnail");
      setUploadingThumbnail(false);
    }
  }

  function openPolicyEditor(course: Course) {
    setPolicyTarget(course);
    setPolicyDraft({
      hasAssessment: course.hasAssessment ?? true,
      passingScorePct:
        typeof course.passingScore === "number" ? Math.round(course.passingScore * 100) : null,
      validityPeriodMonths: course.validityPeriodMonths ?? 0,
    });
    // Pull the org default so the "use default" hint is accurate
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        const setting = (d.settings || []).find((s: { key: string }) => s.key === "defaultPassingScore");
        if (setting) {
          const n = parseFloat(setting.value);
          if (!Number.isNaN(n)) setOrgDefaultPct(Math.round(n * 100));
        }
      })
      .catch(() => { /* keep the 80% fallback */ });
  }

  async function savePolicy() {
    if (!policyTarget || !policyDraft) return;
    setSavingPolicy(true);
    try {
      const updates: Record<string, unknown> = {
        courseId: policyTarget.rowKey,
        hasAssessment: policyDraft.hasAssessment,
      };
      // null clears the override (course will fall back to org default)
      updates.passingScore =
        policyDraft.passingScorePct === null
          ? null
          : policyDraft.passingScorePct / 100;
      // 0 means "never expires" — store as null to clear any existing value
      updates.validityPeriodMonths =
        policyDraft.validityPeriodMonths > 0 ? policyDraft.validityPeriodMonths : null;

      const res = await fetch("/api/admin/courses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!data.error) {
        setPolicyTarget(null);
        setPolicyDraft(null);
        loadCourses();
      }
    } catch { /* keep modal open on error */ }
    setSavingPolicy(false);
  }

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
                {["Thumbnail", "Course", "Category", "Modules", "Status", "Actions"].map((h) => (
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
                    <button
                      onClick={() => openThumbnailModal(course)}
                      className="relative w-12 h-12 rounded-lg overflow-hidden transition-all duration-150 hover:ring-2 hover:ring-[var(--teal-400)] group"
                      style={{ border: "1px solid var(--border-default)" }}
                      title={course.thumbnailUrl ? "Replace thumbnail" : "Upload thumbnail"}
                    >
                      {course.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={course.thumbnailUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#445A73] to-[#A8BDD4]"
                        >
                          <IconPhoto size={18} style={{ color: "rgba(255,255,255,0.85)" }} />
                        </div>
                      )}
                      <div
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                        style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
                      >
                        <IconPhotoUp size={16} style={{ color: "#fff" }} />
                      </div>
                    </button>
                  </td>
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
                        onClick={() => openThumbnailModal(course)}
                        className="rounded-lg p-2 transition-colors duration-150 hover:bg-[var(--bg-surface)]"
                        title={course.thumbnailUrl ? "Replace thumbnail" : "Upload thumbnail"}
                      >
                        <IconPhotoUp size={16} style={{ color: "var(--text-muted)" }} />
                      </button>
                      <button
                        onClick={() => openPolicyEditor(course)}
                        className="rounded-lg p-2 transition-colors duration-150 hover:bg-[var(--bg-surface)]"
                        title="Edit completion policy"
                      >
                        <IconAdjustments size={16} style={{ color: "var(--text-muted)" }} />
                      </button>
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

      {/* Completion-policy editor modal */}
      {policyTarget && policyDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => { setPolicyTarget(null); setPolicyDraft(null); }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative rounded-2xl p-8 w-full max-w-md shadow-2xl"
            style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "20px", color: "var(--text-primary)" }}>
              Completion policy
            </h3>
            <p className="mt-1" style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)" }}>
              {policyTarget.title}
            </p>

            {/* Has assessment toggle */}
            <div className="mt-5">
              <label className="block" style={{ fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                Does this course have a quiz?
              </label>
              <p className="mt-1" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
                If no, completion is granted as soon as the learner reaches the last slide.
              </p>
              <div className="mt-3 flex items-center gap-2">
                {[
                  { v: true, label: "Yes, it has a quiz" },
                  { v: false, label: "No, just slides" },
                ].map((opt) => (
                  <button
                    key={String(opt.v)}
                    onClick={() => setPolicyDraft({ ...policyDraft, hasAssessment: opt.v })}
                    className="rounded-full px-4 py-2 transition-colors duration-150"
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "12px",
                      fontWeight: 600,
                      backgroundColor: policyDraft.hasAssessment === opt.v ? "var(--btn-primary)" : "var(--bg-surface)",
                      color: policyDraft.hasAssessment === opt.v ? "var(--deep-50)" : "var(--text-body)",
                      border: "1px solid var(--border-default)",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Passing score (only if has quiz) */}
            {policyDraft.hasAssessment && (
              <div className="mt-6">
                <label className="block" style={{ fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                  Minimum score to pass
                </label>
                <p className="mt-1" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
                  Learners scoring below this on the course quiz won&apos;t complete.
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => setPolicyDraft({ ...policyDraft, passingScorePct: null })}
                    className="rounded-full px-4 py-2 transition-colors duration-150"
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "12px",
                      fontWeight: 600,
                      backgroundColor: policyDraft.passingScorePct === null ? "var(--btn-primary)" : "var(--bg-surface)",
                      color: policyDraft.passingScorePct === null ? "var(--deep-50)" : "var(--text-body)",
                      border: "1px solid var(--border-default)",
                    }}
                  >
                    Use organization default ({orgDefaultPct}%)
                  </button>
                  <button
                    onClick={() =>
                      setPolicyDraft({
                        ...policyDraft,
                        passingScorePct: policyDraft.passingScorePct ?? orgDefaultPct,
                      })
                    }
                    className="rounded-full px-4 py-2 transition-colors duration-150"
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "12px",
                      fontWeight: 600,
                      backgroundColor: policyDraft.passingScorePct !== null ? "var(--btn-primary)" : "var(--bg-surface)",
                      color: policyDraft.passingScorePct !== null ? "var(--deep-50)" : "var(--text-body)",
                      border: "1px solid var(--border-default)",
                    }}
                  >
                    Custom
                  </button>
                </div>

                {policyDraft.passingScorePct !== null && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={policyDraft.passingScorePct}
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10);
                        if (!Number.isNaN(n)) {
                          setPolicyDraft({ ...policyDraft, passingScorePct: Math.max(0, Math.min(100, n)) });
                        }
                      }}
                      className="w-24 px-3 py-2 rounded-md text-sm"
                      style={{
                        fontFamily: "var(--font-body)",
                        backgroundColor: "var(--bg-surface)",
                        border: "1px solid var(--border-default)",
                        color: "var(--text-primary)",
                      }}
                    />
                    <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)" }}>
                      %
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* CE credit validity period */}
            <div className="mt-6">
              <label className="block" style={{ fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                CE credit validity (months)
              </label>
              <p className="mt-1" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
                How long the credit is valid after completion. After this, learners must retake the course to renew. Leave at 0 if the credit never expires.
              </p>

              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {[
                  { v: 0, label: "Never expires" },
                  { v: 12, label: "12 months" },
                  { v: 24, label: "24 months" },
                  { v: 36, label: "36 months" },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setPolicyDraft({ ...policyDraft, validityPeriodMonths: opt.v })}
                    className="rounded-full px-4 py-2 transition-colors duration-150"
                    style={{
                      fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 600,
                      backgroundColor: policyDraft.validityPeriodMonths === opt.v ? "var(--btn-primary)" : "var(--bg-surface)",
                      color: policyDraft.validityPeriodMonths === opt.v ? "var(--deep-50)" : "var(--text-body)",
                      border: "1px solid var(--border-default)",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>Custom:</span>
                <input
                  type="number"
                  min={0}
                  max={120}
                  step={1}
                  value={policyDraft.validityPeriodMonths}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (!Number.isNaN(n)) {
                      setPolicyDraft({ ...policyDraft, validityPeriodMonths: Math.max(0, Math.min(120, n)) });
                    }
                  }}
                  className="w-24 px-3 py-2 rounded-md text-sm"
                  style={{
                    fontFamily: "var(--font-body)",
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                />
                <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)" }}>
                  months
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 mt-7">
              <button
                onClick={() => { setPolicyTarget(null); setPolicyDraft(null); }}
                className="rounded-[5px] px-5 py-2.5 transition-colors duration-150"
                style={{
                  fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase",
                  backgroundColor: "var(--bg-surface)", color: "var(--text-body)", border: "1px solid var(--border-default)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={savePolicy}
                disabled={savingPolicy}
                className="rounded-[5px] px-5 py-2.5 transition-colors duration-150 hover:opacity-90 disabled:opacity-50"
                style={{
                  fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase",
                  backgroundColor: "var(--btn-primary)", color: "var(--teal-50)",
                }}
              >
                {savingPolicy ? "Saving…" : "Save policy"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thumbnail upload modal */}
      {thumbnailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={closeThumbnailModal}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative rounded-2xl p-8 w-full max-w-md shadow-2xl"
            style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "20px", color: "var(--text-primary)" }}>
                  Course thumbnail
                </h3>
                <p className="mt-1" style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)" }}>
                  {thumbnailTarget.title}
                </p>
              </div>
              <button
                onClick={closeThumbnailModal}
                className="rounded-lg p-1.5 transition-colors duration-150 hover:bg-[var(--bg-surface)]"
                title="Close"
              >
                <IconX size={18} style={{ color: "var(--text-muted)" }} />
              </button>
            </div>

            {/* Drop zone / preview */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleThumbnailFile(f);
              }}
              onClick={() => !thumbnailFile && thumbnailInputRef.current?.click()}
              className="mt-5 rounded-xl flex items-center justify-center cursor-pointer transition-colors duration-150"
              style={{
                minHeight: "200px",
                backgroundColor: isDragging ? "var(--teal-50)" : "var(--bg-surface)",
                border: `2px dashed ${isDragging ? "var(--teal-400)" : "var(--border-default)"}`,
              }}
            >
              {thumbnailPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbnailPreview}
                  alt="Preview"
                  className="max-h-[260px] max-w-full rounded-lg"
                  style={{ objectFit: "contain" }}
                />
              ) : thumbnailTarget.thumbnailUrl ? (
                <div className="text-center p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbnailTarget.thumbnailUrl}
                    alt="Current thumbnail"
                    className="max-h-[180px] max-w-full rounded-lg mx-auto"
                    style={{ objectFit: "contain" }}
                  />
                  <p className="mt-3" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
                    Click or drop to replace
                  </p>
                </div>
              ) : (
                <div className="text-center p-6">
                  <IconPhotoUp size={32} style={{ color: "var(--text-muted)" }} className="mx-auto" />
                  <p className="mt-3" style={{ fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                    Drop an image here, or click to browse
                  </p>
                  <p className="mt-1" style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>
                    JPEG, PNG, or WebP · Max 2MB
                  </p>
                </div>
              )}
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleThumbnailFile(e.target.files?.[0] || null)}
              />
            </div>

            {thumbnailError && (
              <div
                className="mt-3 rounded-lg p-3"
                style={{ backgroundColor: "rgba(192, 74, 64, 0.06)", border: "1px solid rgba(192, 74, 64, 0.15)" }}
              >
                <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "#C04A40" }}>
                  {thumbnailError}
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-between gap-3 mt-6">
              {thumbnailTarget.thumbnailUrl && !thumbnailFile ? (
                <button
                  onClick={removeThumbnail}
                  disabled={uploadingThumbnail}
                  className="rounded-[5px] px-4 py-2.5 transition-colors duration-150 hover:opacity-90 disabled:opacity-50"
                  style={{
                    fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase",
                    backgroundColor: "transparent", color: "#C04A40", border: "1px solid rgba(192, 74, 64, 0.3)",
                  }}
                >
                  Remove
                </button>
              ) : <div />}
              <div className="flex items-center gap-3">
                <button
                  onClick={closeThumbnailModal}
                  disabled={uploadingThumbnail}
                  className="rounded-[5px] px-5 py-2.5 transition-colors duration-150 disabled:opacity-50"
                  style={{
                    fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase",
                    backgroundColor: "var(--bg-surface)", color: "var(--text-body)", border: "1px solid var(--border-default)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={uploadThumbnail}
                  disabled={!thumbnailFile || uploadingThumbnail}
                  className="rounded-[5px] px-5 py-2.5 transition-colors duration-150 hover:opacity-90 disabled:opacity-50"
                  style={{
                    fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase",
                    backgroundColor: "var(--btn-primary)", color: "var(--teal-50)",
                  }}
                >
                  {uploadingThumbnail ? "Uploading…" : "Upload"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
