// pages/admin/repo-health.js
// Simple UI to run the repo health checks and display pass/fail.

import { useEffect, useState } from "react";
import Head from "next/head";

export default function RepoHealthPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const r = await fetch("/api/repo-health");
      const j = await r.json();
      setResult(j);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { run(); }, []);

  return (
    <>
      <Head><title>Repo Health — RapidRoutes</title></Head>
      <main className="mx-auto max-w-4xl p-6 text-gray-100">
        <h1 className="mb-4 text-2xl font-bold">Repo Health</h1>
        <button
          onClick={run}
          disabled={loading}
          className="mb-4 rounded bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600 disabled:opacity-50"
        >
          {loading ? "Running…" : "Re-run checks"}
        </button>

        {!result ? null : (
          <div className="space-y-2">
            {result.checks.map((c, i) => (
              <div
                key={i}
                className={`rounded border p-3 text-sm ${
                  c.ok ? "border-green-700 bg-green-900/30" : "border-red-700 bg-red-900/30"
                }`}
              >
                <div className="font-semibold">{c.ok ? "PASS" : "FAIL"} — {c.name}</div>
                {c.note && <div className="mt-1 text-gray-300">{c.note}</div>}
              </div>
            ))}
          </div>
        )}

        {result && (
          <div className="mt-6 rounded border border-gray-700 p-3 text-sm">
            Overall:{" "}
            <span className={result.ok ? "text-green-400" : "text-amber-300"}>
              {result.ok ? "All critical checks passed" : "Some checks failed — see above"}
            </span>
          </div>
        )}
      </main>
    </>
  );
}
