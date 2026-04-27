"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { IconUpload, IconFileZip, IconCheck, IconAlertTriangle, IconLoader2 } from "@tabler/icons-react";

type Step = "upload" | "uploading" | "metadata" | "publishing" | "done";

interface ParsedManifest {
  activityId: string;
  title: string;
  launchFile: string;
  moduleCount: number;
  interactionCount: number;
  totalActivities: number;
  modules: Array<{ id: string; name: string; type: string }>;
  interactions: Array<{ id: string; name: string; type: string }>;
}

interface UploadResult {
  courseId: string;
  blobBasePath: string;
  manifest: ParsedManifest;
}

const defaultCategories = ["Compliance", "Clinical Skills", "Safety", "Policy", "Wellness", "Other"];
const colors = [
  { label: "Steel", value: "from-[#445A73] to-[#A8BDD4]" },
  { label: "Deep", value: "from-[#2A3D52] to-[#647A93]" },
  { label: "Ocean", value: "from-[#2A3D52] to-[#A8BDD4]" },
  { label: "Slate", value: "from-[#445A73] to-[#647A93]" },
];

export default function UploadCoursePage() {
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Metadata form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Compliance");
  const [customCategory, setCustomCategory] = useState("");
  const [credits, setCredits] = useState("2");
  const [duration, setDuration] = useState("");
  const [accreditation, setAccreditation] = useState("");
  const [selectedColor, setSelectedColor] = useState(colors[0].value);

  async function handleFile(file: File) {
    if (!file.name.endsWith(".zip")) {
      setError("Please upload a .zip file");
      return;
    }

    setError(null);
    setStep("uploading");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/courses/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Upload failed");
      }

      setUploadResult(data);
      setTitle(data.manifest.title || "");
      setDuration(`${data.manifest.moduleCount * 3} min`);
      setStep("metadata");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setStep("upload");
    }
  }

  async function handlePublish() {
    if (!uploadResult) return;

    setStep("publishing");

    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: uploadResult.courseId,
          title,
          description,
          category: category === "Other" ? customCategory : category,
          activityId: uploadResult.manifest.activityId,
          launchFile: uploadResult.manifest.launchFile,
          blobBasePath: uploadResult.blobBasePath,
          credits: parseInt(credits) || 0,
          duration,
          accreditation,
          moduleCount: uploadResult.manifest.moduleCount,
          interactionCount: uploadResult.manifest.interactionCount,
          totalActivities: uploadResult.manifest.totalActivities,
          color: selectedColor,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to save");
      }

      // Publish it
      await fetch("/api/admin/courses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: uploadResult.courseId, status: "published" }),
      });

      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
      setStep("metadata");
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-[900px] mx-auto">
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-l)", color: "var(--text-primary)" }}>
          Upload Course
        </h1>
        <p className="mt-2" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-body)" }}>
          Upload an Articulate Storyline xAPI package (.zip) to create a new course.
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mt-8 mb-8">
        {["Upload", "Configure", "Publish"].map((label, i) => {
          const stepIndex = { upload: 0, uploading: 0, metadata: 1, publishing: 2, done: 2 }[step];
          const isActive = i === stepIndex;
          const isDone = i < stepIndex || step === "done";
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-px" style={{ backgroundColor: isDone ? "#445A73" : "var(--border-default)" }} />}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  backgroundColor: isDone ? "#445A73" : isActive ? "var(--btn-primary)" : "var(--bg-surface)",
                  color: isDone || isActive ? "#EEF3F8" : "var(--text-muted)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {isDone ? <IconCheck size={14} /> : i + 1}
              </div>
              <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: isActive ? 600 : 400, color: isActive ? "var(--text-primary)" : "var(--text-muted)" }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 rounded-xl px-5 py-4 mb-6"
            style={{ backgroundColor: "var(--amber-50)", border: "1px solid var(--amber-200)", color: "var(--amber-600)" }}
          >
            <IconAlertTriangle size={18} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: "14px" }}>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step: Upload */}
      {(step === "upload" || step === "uploading") && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}
        >
          <div
            className="p-12 flex flex-col items-center justify-center cursor-pointer transition-colors duration-200"
            style={{ backgroundColor: dragOver ? "var(--teal-50)" : "transparent", minHeight: "300px" }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file) handleFile(file); }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".zip" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }} />

            {step === "uploading" ? (
              <div className="text-center">
                <IconLoader2 size={40} className="animate-spin mx-auto" style={{ color: "var(--teal-400)" }} />
                <p className="mt-4" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-primary)", fontWeight: 600 }}>Uploading & parsing...</p>
                <p className="mt-1" style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)" }}>Extracting files and reading tincan.xml</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ backgroundColor: "var(--teal-50)" }}>
                  <IconFileZip size={32} stroke={1.5} style={{ color: "#445A73" }} />
                </div>
                <p className="mt-4" style={{ fontFamily: "var(--font-body)", fontSize: "16px", color: "var(--text-primary)", fontWeight: 600 }}>
                  Drag & drop your Storyline .zip here
                </p>
                <p className="mt-1" style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)" }}>
                  or click to browse — must contain tincan.xml
                </p>
                <button
                  className="mt-6 flex items-center gap-2 mx-auto rounded-[5px] px-6 py-3"
                  style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: "var(--btn-primary)", color: "var(--teal-50)" }}
                >
                  <IconUpload size={14} />
                  Choose File
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step: Metadata */}
      {step === "metadata" && uploadResult && (
        <div>
          {/* Auto-parsed info */}
          <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: "var(--teal-50)", border: "1px solid var(--teal-100)" }}>
            <h3 style={{ fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: 700, color: "var(--teal-600)" }}>Auto-detected from tincan.xml</h3>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Field label="Activity ID" value={uploadResult.manifest.activityId} readonly />
              <Field label="Launch File" value={uploadResult.manifest.launchFile} readonly />
              <Field label="Modules" value={String(uploadResult.manifest.moduleCount)} readonly />
              <Field label="Interactions" value={String(uploadResult.manifest.interactionCount)} readonly />
            </div>
            {uploadResult.manifest.modules.length > 0 && (
              <div className="mt-4">
                <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--teal-600)" }}>Modules Found</span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {uploadResult.manifest.modules.slice(0, 10).map((m) => (
                    <span key={m.id} className="rounded-full px-2.5 py-0.5" style={{ fontFamily: "var(--font-body)", fontSize: "11px", backgroundColor: "var(--bg-raised)", color: "var(--text-body)", border: "1px solid var(--teal-100)" }}>
                      {m.name || m.id.split("/").pop()}
                    </span>
                  ))}
                  {uploadResult.manifest.modules.length > 10 && (
                    <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--text-muted)" }}>
                      +{uploadResult.manifest.modules.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Manual fields */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}>
            <h3 style={{ fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>Course Details</h3>
            <p className="mt-1 mb-6" style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)" }}>Fill in the information learners will see.</p>

            <div className="space-y-5">
              <InputField label="Course Title" value={title} onChange={setTitle} />
              <div>
                <label style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-body)", display: "block", marginBottom: "6px" }}>Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-lg px-4 py-3 outline-none resize-none" style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-primary)", backgroundColor: "var(--bg-page)", border: "1px solid var(--border-default)" }} placeholder="What will learners gain from this course?" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-body)", display: "block", marginBottom: "6px" }}>Category</label>
                  <select value={category} onChange={(e) => { setCategory(e.target.value); if (e.target.value !== "Other") setCustomCategory(""); }} className="w-full rounded-lg px-4 py-3 outline-none appearance-none" style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-primary)", backgroundColor: "var(--bg-page)", border: "1px solid var(--border-default)" }}>
                    {defaultCategories.map((c) => (<option key={c} value={c}>{c}</option>))}
                  </select>
                  {category === "Other" && (
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Enter custom category name"
                      className="w-full rounded-lg px-4 py-3 outline-none mt-2"
                      style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-primary)", backgroundColor: "var(--bg-page)", border: "1px solid var(--border-default)" }}
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InputField label="Estimated Duration" value={duration} onChange={setDuration} placeholder="e.g. 30 min" />
                <InputField label="Accreditation Body" value={accreditation} onChange={setAccreditation} placeholder="e.g. CMS, ANCC, OSHA" />
              </div>

              {/* Color picker */}
              <div>
                <label style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-body)", display: "block", marginBottom: "6px" }}>Card Color</label>
                <div className="flex gap-3">
                  {colors.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setSelectedColor(c.value)}
                      className={`w-16 h-10 rounded-lg bg-gradient-to-br ${c.value} transition-all duration-200 ${selectedColor === c.value ? "ring-2 ring-offset-2" : ""}`}
                      style={{ "--tw-ring-color": "var(--btn-primary)" } as React.CSSProperties}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-8 pt-6" style={{ borderTop: "1px solid var(--border-default)" }}>
              <button
                onClick={() => { setStep("upload"); setUploadResult(null); setError(null); }}
                className="rounded-[5px] px-5 py-2.5"
                style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", border: "1px solid var(--border-default)" }}
              >
                Start Over
              </button>
              <button
                onClick={handlePublish}
                disabled={!title}
                className="rounded-[5px] px-6 py-2.5 transition-opacity duration-200 disabled:opacity-50"
                style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: "var(--btn-primary)", color: "var(--teal-50)" }}
              >
                Publish Course
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step: Publishing */}
      {step === "publishing" && (
        <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}>
          <IconLoader2 size={40} className="animate-spin mx-auto" style={{ color: "var(--teal-400)" }} />
          <p className="mt-4" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-primary)", fontWeight: 600 }}>Publishing course...</p>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: "#E8F0E8" }}>
            <IconCheck size={32} style={{ color: "#3A6A5A" }} />
          </div>
          <h2 className="mt-4" style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-m)", color: "var(--text-primary)" }}>
            Course Published
          </h2>
          <p className="mt-2" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-body)" }}>
            &ldquo;{title}&rdquo; is now available in the course catalog.
          </p>
          <div className="flex items-center gap-3 justify-center mt-6">
            <button
              onClick={() => { setStep("upload"); setUploadResult(null); setTitle(""); setDescription(""); setError(null); }}
              className="rounded-[5px] px-5 py-2.5"
              style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", border: "1px solid var(--border-default)" }}
            >
              Upload Another
            </button>
            <a
              href="/instructor/courses"
              className="rounded-[5px] px-5 py-2.5 inline-block"
              style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: "var(--btn-primary)", color: "var(--teal-50)" }}
            >
              View All Courses
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reusable form components ──

function Field({ label, value, readonly }: { label: string; value: string; readonly?: boolean }) {
  return (
    <div>
      <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--teal-600)" }}>{label}</span>
      <div className="mt-1 font-mono text-sm truncate" style={{ color: "var(--text-primary)" }}>{value}</div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-body)", display: "block", marginBottom: "6px" }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg px-4 py-3 outline-none" style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-primary)", backgroundColor: "var(--bg-page)", border: "1px solid var(--border-default)" }} />
    </div>
  );
}
