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
      // Parse origin and destination (they need to be in "City,ST" format)
      // Make sure we extract just the city and state part
      const originParts = origin.split(',');
      const destParts = destination.split(',');
      
      const originFormatted = originParts.length >= 2 ? 
        `${originParts[0].trim()},${originParts[1].trim()}` : origin;
      const destFormatted = destParts.length >= 2 ? 
        `${destParts[0].trim()},${destParts[1].trim()}` : destination;
      
      const params = new URLSearchParams({
        origin: originFormatted,
        dest: destFormatted,
        equip: equipment,
      });
      if (fill) params.set("fill", "1");
      
      console.log(`Fetching crawl preview with params:`, Object.fromEntries(params.entries()));
      
      const r = await fetch(`/api/debugCrawl?${params.toString()}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Crawl failed");
      setRes(j);
    } catch (e) {
      console.error("Crawl preview error:", e);
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
    <div className="mb-4 rounded-xl border border-gray-700 bg-gray-800 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-200">
          <span className="font-semibold">Smart Crawl Preview</span>{" "}
          <span className="text-gray-400">— see how many intelligent pairs can be generated for this lane.</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={!canCheck || loading}
            onClick={() => check(false)}
            className="rounded bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Checking...
              </span>
            ) : "Check Smart Picks"}
          </button>
          <button
            disabled={!canCheck || loading}
            onClick={() => check(true)}
            className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            title="Allows justified KMA duplicates to reach 10 when needed"
          >
            {loading ? "Checking..." : "Re-check with Fill-to-10"}
          </button>
        </div>
      </div>

      {err && <div className="mt-3 text-sm text-red-400 p-2 bg-red-900/20 border border-red-800 rounded">{err}</div>}

      {res && (
        <div className="mt-3 rounded-lg border border-gray-700 bg-gray-900 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              Generated <span className="font-semibold text-blue-300">{res.count}</span> smart pair(s)
              {res.allowedDuplicates ? " (Fill-to-10 used)" : ""}.
              {res.shortfallReason && res.count < 10 ? (
                <span className="ml-2 text-gray-400">Reason: <em>{res.shortfallReason.replaceAll("_", " ")}</em></span>
              ) : null}
            </div>
            {res.count < 10 && (
              <button
                onClick={exportAllFill}
                className="rounded bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700 transition-colors"
                title="Export all PENDING lanes allowing justified KMA dup to fill to 10"
              >
                Export Pending (Fill-to-10)
              </button>
            )}
          </div>

          {Array.isArray(res.pairs) && res.pairs.length > 0 && (
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              {res.pairs.slice(0, 10).map((p, i) => (
                <div key={i} className="rounded border border-gray-700 bg-gray-800 p-2 hover:bg-gray-750 transition-colors">
                  <div className="text-gray-200">
                    <span className="font-semibold">{p.pickup.city}, {p.pickup.state}</span>
                    <span className="mx-2 text-gray-400">→</span>
                    <span className="font-semibold">{p.delivery.city}, {p.delivery.state}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="text-xs text-gray-400">
                      {p.pickup.kma_code} → {p.delivery.kma_code}
                    </div>
                    <div className="text-xs px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300">
                      score: {p.score?.toFixed?.(3) ?? "-"}
                    </div>
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
