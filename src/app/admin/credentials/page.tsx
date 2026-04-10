"use client";

import { useEffect, useState } from "react";

interface Credential {
  apiKey: string;
  displayName: string;
  scopes: string[];
  isActive: boolean;
  rateLimitPerMinute: number;
}

interface NewCredential {
  apiKey: string;
  apiSecret: string;
  displayName: string;
}

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newCred, setNewCred] = useState<NewCredential | null>(null);
  const [formName, setFormName] = useState("");
  const [formHomePage, setFormHomePage] = useState("https://lrs.example.com");
  const [creating, setCreating] = useState(false);

  async function loadCredentials() {
    const res = await fetch("/api/admin/credentials");
    const data = await res.json();
    setCredentials(data.credentials || []);
    setLoading(false);
  }

  useEffect(() => { loadCredentials(); }, []);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: formName, homePage: formHomePage }),
      });
      const data = await res.json();
      setNewCred({ apiKey: data.apiKey, apiSecret: data.apiSecret, displayName: formName });
      setFormName("");
      loadCredentials();
    } catch (e) {
      console.error(e);
    }
    setCreating(false);
  }

  async function toggleActive(apiKey: string, isActive: boolean) {
    await fetch("/api/admin/credentials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, isActive }),
    });
    loadCredentials();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Credentials</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage xAPI Basic Auth credentials for activity providers
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setNewCred(null); }}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Credential
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl p-6">
          {newCred ? (
            <div>
              <h3 className="text-sm font-semibold text-green-700 mb-3">
                Credential Created — Save the Secret Now
              </h3>
              <div className="space-y-3 font-mono text-sm">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">API Key</label>
                  <div className="bg-gray-50 border rounded p-2 select-all break-all">
                    {newCred.apiKey}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">API Secret (shown once)</label>
                  <div className="bg-yellow-50 border border-yellow-300 rounded p-2 select-all break-all">
                    {newCred.apiSecret}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Basic Auth Header</label>
                  <div className="bg-gray-50 border rounded p-2 select-all break-all">
                    Basic {typeof window !== "undefined" ? btoa(`${newCred.apiKey}:${newCred.apiSecret}`) : ""}
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setShowCreate(false); setNewCred(null); }}
                className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
              >
                Done
              </button>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Create New Credential</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Display Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. LMS Production"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Home Page URL</label>
                  <input
                    type="text"
                    value={formHomePage}
                    onChange={(e) => setFormHomePage(e.target.value)}
                    placeholder="https://lms.example.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={!formName || creating}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Credentials table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Name</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">API Key</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Scopes</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Rate Limit</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Status</th>
              <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">Loading...</td>
              </tr>
            ) : credentials.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">No credentials yet</td>
              </tr>
            ) : (
              credentials.map((cred) => (
                <tr key={cred.apiKey} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{cred.displayName}</td>
                  <td className="px-5 py-3.5">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                      {cred.apiKey.slice(0, 20)}...
                    </code>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1 flex-wrap">
                      {cred.scopes.map((s) => (
                        <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{cred.rateLimitPerMinute}/min</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        cred.isActive
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {cred.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => toggleActive(cred.apiKey, !cred.isActive)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        cred.isActive
                          ? "bg-red-50 text-red-700 hover:bg-red-100"
                          : "bg-green-50 text-green-700 hover:bg-green-100"
                      }`}
                    >
                      {cred.isActive ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
