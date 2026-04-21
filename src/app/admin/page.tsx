"use client";

import { useEffect, useState } from "react";

interface Stats {
  currentMonth: string;
  totalStatements: number;
  voidedCount: number;
  activeStatements: number;
  credentialCount: number;
  topVerbs: Array<{ verb: string; count: number }>;
  topActors: Array<{ actor: string; count: number }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || data?.error) {
          setError(data?.message || `Request failed with status ${r.status}`);
          return;
        }
        // Defensive: ensure required arrays exist
        setStats({
          ...data,
          topVerbs: Array.isArray(data.topVerbs) ? data.topVerbs : [],
          topActors: Array.isArray(data.topActors) ? data.topActors : [],
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 max-w-lg">
          <h2 className="text-sm font-semibold text-red-900">Unable to load dashboard</h2>
          <p className="text-sm text-red-700 mt-1">{error}</p>
          <p className="text-xs text-red-600 mt-3">
            This page requires admin or instructor access. If you believe this is an error, contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return <div className="p-8 text-red-600">Failed to load stats</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Overview for {stats.currentMonth}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Statements"
          value={stats.totalStatements}
          color="blue"
        />
        <StatCard
          label="Active Statements"
          value={stats.activeStatements}
          color="green"
        />
        <StatCard
          label="Voided"
          value={stats.voidedCount}
          color="red"
        />
        <StatCard
          label="Credentials"
          value={stats.credentialCount}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Verbs */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Top Verbs
          </h2>
          {stats.topVerbs.length === 0 ? (
            <p className="text-sm text-gray-400">No statements yet</p>
          ) : (
            <div className="space-y-3">
              {stats.topVerbs.map((v) => (
                <div key={v.verb} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 font-medium">{v.verb}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${(v.count / stats.topVerbs[0].count) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{v.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Actors */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Top Learners
          </h2>
          {stats.topActors.length === 0 ? (
            <p className="text-sm text-gray-400">No statements yet</p>
          ) : (
            <div className="space-y-3">
              {stats.topActors.map((a) => (
                <div key={a.actor} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 font-medium font-mono">
                    {a.actor}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${(a.count / stats.topActors[0].count) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{a.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "blue" | "green" | "red" | "purple";
}) {
  const colors = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-green-50 border-green-200 text-green-700",
    red: "bg-red-50 border-red-200 text-red-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
  };

  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-75">{label}</div>
      <div className="text-3xl font-bold mt-2">{value.toLocaleString()}</div>
    </div>
  );
}
