"use client";

import { useEffect, useState, useCallback } from "react";

interface Statement {
  id: string;
  actor: { name?: string; account?: { name: string; homePage?: string }; mbox?: string; mbox_sha1sum?: string; openid?: string };
  verb: { id: string; display?: Record<string, string> };
  object: { id?: string; definition?: { name?: Record<string, string> }; objectType?: string };
  result?: { score?: { scaled?: number; raw?: number; min?: number; max?: number }; success?: boolean; completion?: boolean };
  context?: { registration?: string };
  stored: string;
  timestamp: string;
  _meta: { isVoided: boolean; credentialId: string };
}

const VERB_COLORS: Record<string, string> = {
  attempted: "text-yellow-700",
  experienced: "text-blue-600",
  completed: "text-green-700",
  passed: "text-emerald-700",
  failed: "text-red-600",
  answered: "text-purple-700",
  voided: "text-gray-500",
  terminated: "text-orange-600",
  satisfied: "text-teal-700",
  initialized: "text-indigo-600",
  launched: "text-indigo-600",
  left: "text-orange-500",
};

export default function StatementsPage() {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [agentProp, setAgentProp] = useState<"mbox" | "account" | "openid">("account");
  const [agentValue, setAgentValue] = useState("");
  const [verbFilter, setVerbFilter] = useState("");
  const [activityFilter, setActivityFilter] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showVoided, setShowVoided] = useState(false);
  const [limitCount, setLimitCount] = useState(50);

  const loadStatements = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", String(limitCount));
    if (verbFilter) params.set("verb", verbFilter);
    if (activityFilter) params.set("activity", activityFilter);
    if (showVoided) params.set("voided", "true");
    if (agentValue) {
      if (agentProp === "account") {
        params.set("actor", agentValue);
      } else {
        params.set("actor", agentValue);
      }
    }

    const res = await fetch(`/api/admin/statements?${params}`);
    const data = await res.json();
    setStatements(data.statements || []);
    setLoading(false);
  }, [verbFilter, activityFilter, agentValue, agentProp, showVoided, limitCount]);

  useEffect(() => { loadStatements(); }, [loadStatements]);

  function getActorName(actor: Statement["actor"]): string {
    if (actor.name) return actor.name;
    if (actor.account) return actor.account.name;
    if (actor.mbox) return actor.mbox.replace("mailto:", "");
    return "Unknown Actor";
  }

  function getVerbLabel(verb: Statement["verb"]): string {
    if (verb.display) {
      const first = Object.values(verb.display)[0];
      if (first) return first;
    }
    return verb.id.split("/").pop() || verb.id;
  }

  function getVerbColor(verbId: string): string {
    const short = verbId.split("/").pop() || "";
    return VERB_COLORS[short] || "text-blue-600";
  }

  function getObjectName(obj: Statement["object"]): string {
    if (obj.definition?.name) {
      const first = Object.values(obj.definition.name)[0];
      if (first) return first;
    }
    if (obj.id) return obj.id;
    return "Unknown Object";
  }

  function getScoreText(result?: Statement["result"]): string | null {
    if (!result?.score) return null;
    if (result.score.raw !== undefined) {
      return `with score ${result.score.raw}`;
    }
    if (result.score.scaled !== undefined) {
      return `with score ${Math.round(result.score.scaled * 100)}%`;
    }
    return null;
  }

  function formatTimestamp(ts: string): string {
    const d = new Date(ts);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const time = d.toTimeString().split(" ")[0];
    const ms = String(d.getMilliseconds()).padStart(3, "0");
    return `${year}-${month}-${day}T${time}.${ms}`;
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">xAPI LRS Viewer</h1>
      </div>

      {/* Filters bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex items-end gap-3 flex-wrap">
          {/* Agent Property */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Agent Property</label>
            <select
              value={agentProp}
              onChange={(e) => setAgentProp(e.target.value as "mbox" | "account" | "openid")}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="mbox">mbox</option>
              <option value="account">account</option>
              <option value="openid">openid</option>
            </select>
          </div>

          {/* Agent Value */}
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Agent Value</label>
            <input
              type="text"
              value={agentValue}
              onChange={(e) => setAgentValue(e.target.value)}
              placeholder={agentProp === "mbox" ? "Email Address" : "Account Name"}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Verb ID */}
          <div className="flex-1 min-w-[150px]">
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Verb ID</label>
            <input
              type="text"
              value={verbFilter}
              onChange={(e) => setVerbFilter(e.target.value)}
              placeholder="Verb"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Activity ID */}
          <div className="flex-1 min-w-[150px]">
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Activity ID</label>
            <input
              type="text"
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              placeholder="Activity ID"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Action buttons row */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={loadStatements}
            className="px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            {showAdvanced ? "Hide" : "Show"} Advanced Options
          </button>
        </div>

        {/* Advanced options */}
        {showAdvanced && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showVoided}
                onChange={(e) => setShowVoided(e.target.checked)}
                className="rounded border-gray-300"
              />
              Include voided statements
            </label>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Limit:</label>
              <select
                value={limitCount}
                onChange={(e) => setLimitCount(parseInt(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="text-xs text-gray-400 ml-auto">
              xAPI Version: 1.0.3
            </div>
          </div>
        )}
      </div>

      {/* Statement timeline */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading statements...</div>
        ) : statements.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No statements found</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {statements.map((stmt) => {
              const actorName = getActorName(stmt.actor);
              const verbLabel = getVerbLabel(stmt.verb);
              const verbColor = getVerbColor(stmt.verb.id);
              const objectName = getObjectName(stmt.object);
              const scoreText = getScoreText(stmt.result);
              const isExpanded = expandedId === stmt.id;

              return (
                <div key={stmt.id}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : stmt.id)}
                    className="w-full text-left px-5 py-3 hover:bg-gray-50 transition-colors flex items-start gap-4"
                  >
                    {/* Timestamp */}
                    <div className="w-44 shrink-0 text-xs text-gray-400 font-mono pt-0.5 leading-tight">
                      {formatTimestamp(stmt.stored)}
                    </div>

                    {/* Statement sentence */}
                    <div className="flex-1 text-sm leading-relaxed">
                      <span className="font-semibold text-gray-900">{actorName}</span>
                      {" "}
                      <span className={`font-bold ${verbColor}`}>{verbLabel}</span>
                      {" "}
                      <span className="text-gray-700">&apos;{objectName}&apos;</span>
                      {scoreText && (
                        <>
                          {" "}
                          <span className="text-orange-600 font-medium">{scoreText}</span>
                        </>
                      )}
                      {stmt._meta.isVoided && (
                        <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">voided</span>
                      )}
                    </div>

                    {/* Expand indicator */}
                    <svg
                      className={`w-4 h-4 text-gray-300 mt-0.5 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded JSON */}
                  {isExpanded && (
                    <div className="px-5 pb-4 bg-gray-50 border-t border-gray-100">
                      <pre className="text-xs text-gray-600 overflow-auto max-h-80 p-4 bg-white rounded-lg border border-gray-200 mt-3 font-mono leading-relaxed">
                        {JSON.stringify(stmt, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-3 text-xs text-gray-400 text-right">
        Showing {statements.length} statement{statements.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
