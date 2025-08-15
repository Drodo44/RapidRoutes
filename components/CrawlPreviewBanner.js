// components/CrawlPreviewBanner.js
import { useState } from "react";

export default function CrawlPreviewBanner({ origin, destination, equipment }) {
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");

  const canCheck = !!origin && !!destination && !!equipment;

  async function check(fill = false) {
    if (!canCheck) return;
    setLoading(true); setErr(""); setRes(null);
    try {
      const params = new URLSearchParams({
        origin,
        dest: destination,
        equip: equipment,
      });
      if (fill) params.set("fill", "1");
      const r = await fetch(`/api/debugCrawl?${params.toString()}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Crawl failed");
      setRes(j);
    } catch (e) {
      setErr(e.message || "Failed to preview crawl");
    } finally {
      setLoading(false);
    }
  }

  async function exportAllFill() {
    const head = await fetch(`/api/exportDatCsv?pending=1&fill=1`, { method: "HEAD" });
    let total = Number(head.headers.get("X-Total-Parts") || "1");
    if (!total || total < 1) total = 1;
    for (let part = 1; part <= total; part++) {
      const a = document.createElement("a");
      a.href = `/api/exportDatCsv?pending=1&fill=1&part=${part}`;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // avoid popup blockers
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-gray-700 bg-[#0f1115] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-200">
          <span className="font-semibold">Smart Crawl Preview</span>{" "}
          <span className="text-gray-400">— see how many intelligent pairs can be generated for this lane.</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={!canCheck || loading}
            onClick={() => check(false)}
            className="rounded bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600 disabled:opacity-50"
          >
            {loading ? "Checking…" : "Check Smart Picks"}
          </button>
          <button
            disabled={!canCheck || loading}
            onClick={() => check(true)}
            className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            title="Allows justified KMA duplicates to reach 10 when needed"
          >
            Re-check with Fill-to-10
          </button>
        </div>
      </div>

      {err && <div className="mt-3 text-sm text-red-400">{err}</div>}

      {res && (
        <div className="mt-3 rounded-lg border border-gray-700 bg-gray-900 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              Generated <span className="font-semibold">{res.count}</span> smart pair(s)
              {res.allowedDuplicates ? " (Fill-to-10 used)" : ""}.
              {res.shortfallReason && res.count < 10 ? (
                <span className="ml-2 text-gray-400">Reason: <em>{res.shortfallReason.replaceAll("_", " ")}</em></span>
              ) : null}
            </div>
            {res.count < 10 && (
              <button
                onClick={exportAllFill}
                className="rounded bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700"
                title="Export all PENDING lanes allowing justified KMA dup to fill to 10"
              >
                Export Pending (Fill-to-10)
              </button>
            )}
          </div>

          {Array.isArray(res.pairs) && res.pairs.length > 0 && (
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              {res.pairs.slice(0, 10).map((p, i) => (
                <div key={i} className="rounded border border-gray-700 bg-[#0f1115] p-2">
                  <div className="text-gray-200">
                    <span className="font-semibold">{p.pickup.city}, {p.pickup.state}</span>
                    {"  "}→{"  "}
                    <span className="font-semibold">{p.delivery.city}, {p.delivery.state}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    score {p.score?.toFixed?.(3) ?? "-"} • {p.reason?.join?.(", ") || "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
