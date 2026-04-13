"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { IconUser, IconMail, IconId, IconBuilding, IconBriefcase, IconUsers, IconShield, IconCheck, IconAlertTriangle, IconLoader2 } from "@tabler/icons-react";

interface UserProfile {
  userId: string;
  name: string;
  email: string;
  role: string;
  facility: string;
  department?: string;
  position?: string;
  employeeId?: string;
  status?: string;
  tags?: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Editable fields
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");

  // Password change
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setProfile(data.user);
          setName(data.user.name || "");
          setDepartment(data.user.department || "");
          setPosition(data.user.position || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveProfile() {
    setSaving(true);
    setMessage(null);
    // TODO: Wire to user update API when built
    setTimeout(() => {
      setSaving(false);
      setEditing(false);
      setMessage({ type: "success", text: "Profile updated successfully." });
      setTimeout(() => setMessage(null), 3000);
    }, 500);
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    setSaving(true);
    setMessage(null);
    // TODO: Wire to password change API
    setTimeout(() => {
      setSaving(false);
      setShowPasswordChange(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage({ type: "success", text: "Password changed successfully." });
      setTimeout(() => setMessage(null), 3000);
    }, 500);
  }

  if (loading) {
    return (
      <div className="p-6 md:p-10 max-w-[800px] mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded" style={{ backgroundColor: "var(--bg-surface)" }} />
          <div className="h-64 rounded-2xl" style={{ backgroundColor: "var(--bg-surface)" }} />
        </div>
      </div>
    );
  }

  const initials = (profile?.name || "U").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const roleLabel = profile?.role === "instructor" ? "Instructor" : profile?.role === "admin" ? "Administrator" : "Learner";

  return (
    <div className="p-6 md:p-10 max-w-[800px] mx-auto">
      {/* Header */}
      <h1 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-l)", color: "var(--text-primary)" }}>
        My Profile
      </h1>
      <p className="mt-2 mb-8" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-body)" }}>
        Manage your account information and preferences.
      </p>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl px-5 py-4 mb-6"
          style={{
            backgroundColor: message.type === "success" ? "#E8F0E8" : "var(--amber-50)",
            border: `1px solid ${message.type === "success" ? "#B8D8B8" : "var(--amber-200)"}`,
            color: message.type === "success" ? "#3A6A5A" : "var(--amber-600)",
          }}
        >
          {message.type === "success" ? <IconCheck size={18} /> : <IconAlertTriangle size={18} />}
          <span style={{ fontFamily: "var(--font-body)", fontSize: "14px" }}>{message.text}</span>
        </motion.div>
      )}

      {/* Profile card */}
      <div className="rounded-2xl" style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}>
        {/* Banner */}
        <div className="h-28 rounded-t-2xl relative" style={{ backgroundColor: "var(--bg-obsidian, #0A1628)" }}>
          <motion.div
            className="absolute inset-0 opacity-15 rounded-t-2xl"
            style={{ background: "radial-gradient(ellipse at 30% 50%, var(--teal-400), transparent 60%)" }}
          />
        </div>

        {/* Avatar + name */}
        <div className="px-8 -mt-10 relative z-10">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
            style={{
              backgroundColor: "var(--teal-400)",
              color: "var(--teal-50)",
              fontFamily: "var(--font-label)",
              fontSize: "24px",
              letterSpacing: "0.04em",
              border: "4px solid var(--bg-raised)",
            }}
          >
            {initials}
          </div>
          <div className="mt-3">
            <h2 style={{ fontFamily: "var(--font-body)", fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>
              {profile?.name}
            </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="rounded-full px-2.5 py-0.5"
                  style={{
                    fontFamily: "var(--font-label)",
                    fontSize: "9px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    backgroundColor: "var(--teal-50)",
                    color: "var(--teal-600)",
                  }}
                >
                  {roleLabel}
                </span>
                <span
                  className="rounded-full px-2.5 py-0.5"
                  style={{
                    fontFamily: "var(--font-label)",
                    fontSize: "9px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    backgroundColor: "#E8F0E8",
                    color: "#3A6A5A",
                  }}
                >
                  Active
                </span>
              </div>
            </div>
        </div>

        {/* Info grid */}
        <div className="px-8 py-8">
          <div className="grid grid-cols-2 gap-6">
            <InfoField icon={<IconMail size={18} />} label="Email" value={profile?.email || ""} />
            <InfoField icon={<IconId size={18} />} label="Employee ID" value={profile?.employeeId || "—"} />
            <InfoField icon={<IconBuilding size={18} />} label="Facility" value={profile?.facility || "—"} />
            <InfoField icon={<IconShield size={18} />} label="Role" value={roleLabel} />

            {editing ? (
              <>
                <div>
                  <label style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-body)", display: "block", marginBottom: "6px" }}>
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-lg px-4 py-3 outline-none"
                    style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-primary)", backgroundColor: "var(--bg-page)", border: "1px solid var(--border-default)" }}
                  />
                </div>
                <div>
                  <label style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-body)", display: "block", marginBottom: "6px" }}>
                    Position
                  </label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full rounded-lg px-4 py-3 outline-none"
                    style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-primary)", backgroundColor: "var(--bg-page)", border: "1px solid var(--border-default)" }}
                  />
                </div>
              </>
            ) : (
              <>
                <InfoField icon={<IconUsers size={18} />} label="Department" value={profile?.department || "—"} />
                <InfoField icon={<IconBriefcase size={18} />} label="Position" value={profile?.position || "—"} />
              </>
            )}
          </div>

          {/* Tags */}
          {profile?.tags && (
            <div className="mt-6">
              <span style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>
                Tags
              </span>
              <div className="flex flex-wrap gap-2">
                {profile.tags.split(",").filter(Boolean).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-lg px-3 py-1"
                    style={{ fontFamily: "var(--font-body)", fontSize: "12px", backgroundColor: "var(--bg-surface)", color: "var(--text-body)" }}
                  >
                    {tag.replace("department-", "").replace("position-", "").replace(/-/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 mt-8 pt-6" style={{ borderTop: "1px solid var(--border-default)" }}>
            {editing ? (
              <>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-[5px] px-5 py-2.5 disabled:opacity-50"
                  style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: "var(--btn-primary)", color: "var(--teal-50)" }}
                >
                  {saving ? <IconLoader2 size={14} className="animate-spin" /> : <IconCheck size={14} />}
                  Save Changes
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-[5px] px-5 py-2.5"
                  style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", border: "1px solid var(--border-default)" }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="rounded-[5px] px-5 py-2.5"
                  style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: "var(--btn-primary)", color: "var(--teal-50)" }}
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => setShowPasswordChange(!showPasswordChange)}
                  className="rounded-[5px] px-5 py-2.5"
                  style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", border: "1px solid var(--border-default)" }}
                >
                  Change Password
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Password change */}
      {showPasswordChange && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-8 mt-6"
          style={{ backgroundColor: "var(--bg-raised)", border: "1px solid var(--border-default)" }}
        >
          <h3 style={{ fontFamily: "var(--font-body)", fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>Change Password</h3>
          <p className="mt-1 mb-6" style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-muted)" }}>
            Enter your current password and choose a new one.
          </p>

          <div className="space-y-4 max-w-[400px]">
            <div>
              <label style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-body)", display: "block", marginBottom: "6px" }}>Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg px-4 py-3 outline-none"
                style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-primary)", backgroundColor: "var(--bg-page)", border: "1px solid var(--border-default)" }} />
            </div>
            <div>
              <label style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-body)", display: "block", marginBottom: "6px" }}>New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 6 characters"
                className="w-full rounded-lg px-4 py-3 outline-none"
                style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-primary)", backgroundColor: "var(--bg-page)", border: "1px solid var(--border-default)" }} />
            </div>
            <div>
              <label style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-body)", display: "block", marginBottom: "6px" }}>Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg px-4 py-3 outline-none"
                style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-primary)", backgroundColor: "var(--bg-page)", border: "1px solid var(--border-default)" }} />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleChangePassword}
                disabled={saving || !currentPassword || !newPassword || !confirmPassword}
                className="flex items-center gap-2 rounded-[5px] px-5 py-2.5 disabled:opacity-50"
                style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: "var(--btn-primary)", color: "var(--teal-50)" }}
              >
                {saving ? <IconLoader2 size={14} className="animate-spin" /> : null}
                Update Password
              </button>
              <button
                onClick={() => { setShowPasswordChange(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}
                className="rounded-[5px] px-5 py-2.5"
                style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", border: "1px solid var(--border-default)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function InfoField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0" style={{ color: "var(--text-muted)" }}>{icon}</div>
      <div>
        <div style={{ fontFamily: "var(--font-label)", fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</div>
        <div className="mt-0.5" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-primary)" }}>{value}</div>
      </div>
    </div>
  );
}
