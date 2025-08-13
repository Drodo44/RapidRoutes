// components/RecapExportButtons.js
import { supabase } from "../utils/supabaseClient.js";

async function fetchLanesIfNeeded(lanes) {
  if (Array.isArray(lanes) && lanes.length) return lanes;
  const { data } = await supabase.from("lanes").select("*").order("created_at", { ascending: false });
  return data || [];
}

function openHtmlRecap(lanes) {
  const css = `
  body{background:#0f1115;color:#e5e7eb;font:14px/1.4 ui-sans-serif,system-ui; margin:24px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}
  .card{border:1px solid #374151;border-radius:12px;padding:12px;background:#0f1115}
  .h{font-weight:700;color:#fff}
  .dim{color:#9ca3af}
  .pill{display:inline-block;background:#1f2937;border-radius:999px;padding:2px 8px;margin-right:6px}
  hr{border:0;border-top:1px solid #374151;margin:12px 0}
  `;
  const win = window.open("", "_blank");
  if (!win) return;
  const rows = lanes.map((l) => {
    const weight = l.randomize_weight ? `${l.weight_min}-${l.weight_max} lbs` : `${l.weight} lbs`;
    return `
      <div class="card">
        <div class="h">${l.origin} → ${l.destination}</div>
        <div class="dim">${l.equipment} • ${l.length}ft • ${weight} • ${l.date || ""}</div>
        ${l.commodity ? `<div class="pill">${l.commodity}</div>` : ""}
        ${l.comment ? `<div class="dim" style="margin-top:6px">${l.comment}</div>` : ""}
      </div>`;
  }).join("");
  win.document.write(`<html><head><title>RapidRoutes Recap</title><style>${css}</style></head>
  <body><h2 class="h" style="margin-bottom:12px">RapidRoutes Recap</h2>
  <div class="grid">${rows}</div>
  <hr/><div class="dim">Sourced from RapidRoutes — printable export</div>
  <script>window.onload=setTimeout(()=>window.print(),250)</script>
  </body></html>`);
  win.document.close();
}

export default function RecapExportButtons({ lanes }) {
  const downloadAll = async (params = "") => {
    const head = await fetch(`/api/exportDatCsv${params}`, { method: "HEAD" });
    let total = Number(head.headers.get("X-Total-Parts") || "1");
    if (!total || total < 1) total = 1;
    for (let part = 1; part <= total; part++) {
      const a = document.createElement("a");
      a.href = `/api/exportDatCsv?part=${part}${params ? `&${params.replace(/^\?/, "")}` : ""}`;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      await new Promise((r) => setTimeout(r, 250));
    }
  };

  const exportHtml = async () => {
    const data = await fetchLanesIfNeeded(lanes);
    openHtmlRecap(data);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 justify-end">
      <button
        onClick={() => downloadAll("")}
        className="rounded-xl bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
      >
        Export DAT CSV
      </button>
      <button
        onClick={() => downloadAll("?fill=1")}
        className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        title="Allow ≤2 per KMA when needed"
      >
        Fill to 10 (allow KMA dup)
      </button>
      <button
        onClick={exportHtml}
        className="rounded-xl bg-gray-700 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-600"
        title="Print-ready recap"
      >
        Export Recap (HTML)
      </button>
    </div>
  );
}
