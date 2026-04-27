"use client";

import { useEffect, useState } from "react";

interface Setting {
  key: string;
  value: string;
  updatedBy: string;
  updatedAt: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state — kept separate from the persisted setting so the user can
  // type freely without committing on every keystroke.
  const [passingScorePct, setPassingScorePct] = useState<number>(80);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      const settingsList: Setting[] = data.settings || [];
      setSettings(settingsList);

      const existing = settingsList.find((s) => s.key === "defaultPassingScore");
      if (existing) {
        const n = parseFloat(existing.value);
        if (!Number.isNaN(n)) setPassingScorePct(Math.round(n * 100));
      }
    } catch {
      setError("Could not load settings");
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function savePassingScore() {
    setSaving(true);
    setSavedMessage(null);
    setError(null);
    try {
      const value = (passingScorePct / 100).toString();
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "defaultPassingScore", value }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.message || "Failed to save");
      } else {
        setSavedMessage("Saved");
        setTimeout(() => setSavedMessage(null), 2500);
        load();
      }
    } catch {
      setError("Failed to save");
    }
    setSaving(false);
  }

  const passingScoreSetting = settings.find((s) => s.key === "defaultPassingScore");

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Organization-wide defaults. Individual courses can override these.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          {/* Default passing score */}
          <div>
            <label className="block text-sm font-semibold text-gray-900">
              Default passing score
            </label>
            <p className="text-xs text-gray-500 mt-1 max-w-prose">
              The minimum quiz score a learner must reach for a course to count
              as completed. Used when a course doesn&apos;t set its own passing
              score. Courses marked as &quot;no quiz&quot; ignore this setting.
            </p>

            <div className="mt-3 flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={passingScorePct}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!Number.isNaN(n)) setPassingScorePct(Math.max(0, Math.min(100, n)));
                }}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-sm text-gray-600">%</span>
              <button
                onClick={savePassingScore}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              {savedMessage && (
                <span className="text-sm text-green-600">{savedMessage}</span>
              )}
              {error && <span className="text-sm text-red-600">{error}</span>}
            </div>

            {passingScoreSetting && (
              <p className="text-xs text-gray-400 mt-2">
                Last changed by {passingScoreSetting.updatedBy} on{" "}
                {new Date(passingScoreSetting.updatedAt).toLocaleString()}
              </p>
            )}
            {!passingScoreSetting && (
              <p className="text-xs text-gray-400 mt-2">
                Currently using the built-in default (80%). Save to override.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
