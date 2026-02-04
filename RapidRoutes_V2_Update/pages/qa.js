// pages/qa.js
import { useState } from "react";

function Row({ name, result }) {
  const ok = result?.ok === true;
  const msg =
    result?.error ||
    (Array.isArray(result?.missing) && result.missing.length ? `Missing: ${result.missing.join(", ")}` : "") ||
    (typeof result?.parts !== "undefined" ? `CSV parts: ${result.parts}` : "") ||
    (typeof result?.sampleCount !== "undefined" ? `Sample: ${result.sampleCount}` : "") ||
    "";
  return (
    <div className="flex items-center justify-between rounded border border-gray-700 bg-[#0f1115] px-3 py-2">
      <div className="text-sm text-gray-200">{name}</div>
      <div className="flex items-center gap-3">
        {msg && <div className="text-xs text-gray-400">{msg}</div>}
        <span className={`rounded px-2 py-0.5 text-xs ${ok ? "bg-green-700 text-white" : "bg-red-700 text-white"}`}>
          {ok ? "PASS" : "FAIL"}
        </span>
      </div>
    </div>
  );
}

export default function QA() {
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [blogMsg, setBlogMsg] = useState("");
  const [csvMsg, setCsvMsg] = useState("");

  async function runAll() {
    setBusy(true); setResults(null); setBlogMsg(""); setCsvMsg("");
    try {
      const r = await fetch("/api/health");
      const j = await r.json();
      setResults(j);
    } catch (e) {
      setResults({ ok: false, error: e.message || "health fetch failed" });
    } finally {
      setBusy(false);
    }
  }

  async function runBlogFetch() {
    setBlogMsg("Running…");
    try {
      const r = await fetch("/api/fetchDatBlog");
      const j = await r.json();
      setBlogMsg(r.ok ? `OK: ${JSON.stringify(j)}` : `Error: ${j.error || "failed"}`);
    } catch (e) {
      setBlogMsg(`Error: ${e.message || "failed"}`);
    }
  }

  async function exportCsv(fill = false) {
    setCsvMsg("Starting download(s)...");
    try {
      const head = await fetch(`/api/exportDatCsv?all=1${fill ? "&fill=1" : ""}`, { method: "HEAD" });
      let total = Number(head.headers.get("X-Total-Parts") || "1");
      if (!total || total < 1) total = 1;
      for (let part = 1; part <= total; part++) {
        const a = document.createElement("a");
        a.href = `/api/exportDatCsv?all=1${fill ? "&fill=1" : ""}&part=${part}`;
        a.download = "";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 200));
      }
      setCsvMsg(`Triggered ${total} file(s).`);
    } catch (e) {
      setCsvMsg(`Error: ${e.message || "failed"}`);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6 text-gray-100">
      <h1 className="mb-3 text-2xl font-bold">RapidRoutes — Pilot Readiness</h1>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={runAll}
          disabled={busy}
          className="rounded bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {busy ? "Running checks…" : "Run All Checks"}
        </button>
        <button
          onClick={runBlogFetch}
          className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          title="Fetch latest DAT blog maps into storage"
        >
          Fetch DAT Maps Now
        </button>
        <button
          onClick={() => exportCsv(false)}
          className="rounded bg-gray-700 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-600"
          title="Export all active lanes"
        >
          Export DAT CSV
        </button>
        <button
          onClick={() => exportCsv(true)}
          className="rounded bg-gray-700 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-600"
          title="Export all with Fill-to-10"
        >
          Export DAT CSV (Fill-to-10)
        </button>
      </div>

      {results && (
        <div className="space-y-2">
          {"error" in results && (
            <div className="rounded border border-red-700 bg-red-900/30 p-3 text-sm text-red-200">
              {results.error}
            </div>
          )}
          <Row name="Environment variables" result={results.env} />
          {Array.isArray(results.tables) &&
            results.tables.map((t) => <Row key={t.table} name={`Table: ${t.table}`} result={t} />)}
          <Row name="Storage: dat_maps bucket" result={results.storage} />
          <Row name="RPC: fetch_nearby_cities" result={results.rpc} />
          <Row name="Export HEAD (all lanes)" result={results.exportHead} />
        </div>
      )}

      {(blogMsg || csvMsg) && (
        <div className="mt-4 space-y-2 text-sm">
          {blogMsg && <div className="rounded border border-gray-700 bg-[#0f1115] p-2 text-gray-200">{blogMsg}</div>}
          {csvMsg && <div className="rounded border border-gray-700 bg-[#0f1115] p-2 text-gray-200">{csvMsg}</div>}
        </div>
      )}
    </main>
  );
}
