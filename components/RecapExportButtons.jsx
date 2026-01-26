// components/RecapExportButtons.js
export default function RecapExportButtons({ lanes }) {
  function openPrint() {
    const html = buildPrintableHtml(lanes);
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={openPrint}
        className="rounded-lg bg-gray-700 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-600"
        title="Open a print-ready HTML page with current active lanes"
      >
        Export Recap (HTML)
      </button>
    </div>
  );
}

function buildPrintableHtml(lanes) {
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const rows = lanes.map((l) => {
    const laneText = [
      esc(l.origin),
      l.origin_state ? `, ${esc(l.origin_state)}` : "",
      l.origin_zip ? ` ${esc(l.origin_zip)}` : "",
      " → ",
      esc(l.destination),
      l.dest_state ? `, ${esc(l.dest_state)}` : "",
      l.dest_zip ? ` ${esc(l.dest_zip)}` : "",
    ].join("");

    const win = (a, b) => (!a || !b ? "—" : (a === b ? fmtUS(a) : `${fmtUS(a)}–${fmtUS(b)}`));
    const weightText = l.randomize_weight
      ? `${l.weight_min || "?"}–${l.weight_max || "?"} lbs`
      : (l.weight ? `${l.weight} lbs` : "—");

    const selling = [
      ...( /^R/i.test(l.equipment) ? ["Reefer-friendly timing and metro coverage."] :
          (/^(F|SD|DD|RGN)/i.test(l.equipment) ? ["Flatbed lanes with reliable steel/industrial demand."] :
            ["Van distribution metros with reload options."]) ),
      ...(l.pickup_earliest && l.pickup_latest && l.pickup_earliest === l.pickup_latest
        ? ["One-day pickup window for faster tendering."]
        : (l.pickup_earliest && l.pickup_latest ? ["Flexible pickup window to increase carrier matches."] : [])),
      ...((!l.randomize_weight && l.weight && Number(l.weight) <= 43000) || (l.randomize_weight && l.weight_max && Number(l.weight_max) <= 43000)
        ? ["Weight-friendly for broader carrier pool."]
        : []),
      "Balanced markets to support reloads and minimize deadhead.",
    ].slice(0, 4);

    return `
      <div class="card">
        <div class="head">${laneText}</div>
        <div class="meta">${esc(l.equipment)} • ${esc(l.length)} ft • ${esc(weightText)}</div>
        <div class="win">Pickup: ${esc(win(l.pickup_earliest, l.pickup_latest))}</div>
        ${l.commodity ? `<div class="line">Commodity: <span>${esc(l.commodity)}</span></div>` : ""}
        ${l.comment ? `<div class="line">Note: <span>${esc(l.comment)}</span></div>` : ""}
        <ul class="selling">
          ${selling.map((s) => `<li>${esc(s)}</li>`).join("")}
        </ul>
      </div>
    `;
  }).join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>RapidRoutes Recap</title>
  <style>
    body { background: #0b0d12; color: #e5e7eb; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial; margin: 24px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    @media print { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    .card { border: 1px solid #374151; border-radius: 12px; padding: 12px; background: #0f1115; }
    .head { font-weight: 600; margin-bottom: 6px; }
    .meta, .win, .line { font-size: 12px; color: #d1d5db; margin-bottom: 4px; }
    .selling { margin: 8px 0 0; padding-left: 18px; font-size: 13px; color: #e5e7eb; }
    .selling li { margin-bottom: 4px; }
    .line span { color: #9ca3af; }
    .title { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
    .title h1 { margin:0; font-size: 18px; }
    .title .count { font-size:12px; color:#9ca3af; }
    @media print { .noprint { display: none; } body { margin:0; } }
    .btn { background:#111827; color:#e5e7eb; border:1px solid #374151; border-radius:8px; padding:6px 10px; cursor:pointer; }
  </style>
</head>
<body>
  <div class="title">
    <h1>RapidRoutes Recap — Active Lanes</h1>
    <div class="count">${lanes.length} item(s)</div>
  </div>
  <div class="noprint" style="margin-bottom:12px;">
    <button class="btn" onclick="window.print()">Print</button>
  </div>
  <div class="grid">
    ${rows}
  </div>
</body>
</html>`;
}

function fmtUS(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${m}/${d}/${y}`;
}
