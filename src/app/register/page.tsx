"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { IconAlertTriangle, IconLoader2 } from "@tabler/icons-react";

const roles = [
  { value: "learner", label: "Learner" },
  { value: "instructor", label: "Instructor" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [facility, setFacility] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [role, setRole] = useState("learner");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, employeeId, password, facility, department, position, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Registration failed");
        setLoading(false);
        return;
      }

      router.push(data.user.role === "instructor" ? "/instructor" : "/learn");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-8" style={{ backgroundColor: "var(--bg-page)" }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[500px]"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="h-7 w-8 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm" style={{ backgroundColor: "var(--teal-400)" }} />
          <span style={{ fontFamily: "var(--font-label)", fontSize: "18px", color: "var(--teal-400)", letterSpacing: "0.04em" }}>Creative Minds</span>
        </div>

        <h2 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-l)", color: "var(--text-primary)" }}>
          Create Account
        </h2>
        <p className="mt-2 mb-8" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-body)" }}>
          Set up your learning profile to get started.
        </p>

        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-xl px-4 py-3 mb-6"
            style={{ backgroundColor: "var(--amber-50)", border: "1px solid var(--amber-200)", color: "var(--amber-600)" }}>
            <IconAlertTriangle size={16} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: "13px" }}>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Full Name" value={name} onChange={setName} required placeholder="Jane Smith" />
            <FormField label="Employee ID" value={employeeId} onChange={setEmployeeId} required placeholder="EMP-001" />
          </div>

          <FormField label="Email" value={email} onChange={setEmail} required type="email" placeholder="jane@company.com" />
          <FormField label="Password" value={password} onChange={setPassword} required type="password" placeholder="Minimum 6 characters" />

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Facility" value={facility} onChange={setFacility} required placeholder="Sunrise Dallas" />
            <div>
              <label style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-body)", display: "block", marginBottom: "6px" }}>Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-lg px-4 py-3 outline-none appearance-none" style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-primary)", backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}>
                {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Department" value={department} onChange={setDepartment} placeholder="Nursing" />
            <FormField label="Position" value={position} onChange={setPosition} placeholder="CNA" />
          </div>

          <button
            type="submit"
            disabled={loading || !name || !email || !employeeId || !password || !facility}
            className="w-full rounded-lg py-3.5 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
            style={{ fontFamily: "var(--font-label)", fontSize: "12px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: "var(--btn-primary)", color: "var(--teal-50)" }}
          >
            {loading ? <IconLoader2 size={16} className="animate-spin" /> : null}
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center" style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <a href="/login" style={{ color: "var(--text-link, var(--teal-400))", fontWeight: 600 }}>Sign In</a>
        </p>
      </motion.div>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type = "text", required = false }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-body)", display: "block", marginBottom: "6px" }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="w-full rounded-lg px-4 py-3 outline-none"
        style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-primary)", backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }} />
    </div>
  );
}
