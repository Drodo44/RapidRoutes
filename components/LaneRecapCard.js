// components/LaneRecapCard.js
export default function LaneRecapCard({ lane }) {
  const laneText = [
    lane.origin,
    lane.origin_state ? `, ${lane.origin_state}` : "",
    lane.origin_zip ? ` ${lane.origin_zip}` : "",
    " → ",
    lane.destination,
    lane.dest_state ? `, ${lane.dest_state}` : "",
    lane.dest_zip ? ` ${lane.dest_zip}` : "",
  ].join("");

  const win = (a, b) => {
    if (!a || !b) return "—";
    return a === b ? fmtUS(a) : `${fmtUS(a)}–${fmtUS(b)}`;
  };

  const weightText = lane.randomize_weight
    ? `${lane.weight_min || "?"}–${lane.weight_max || "?"} lbs`
    : (lane.weight ? `${lane.weight} lbs` : "—");

  // simple, deterministic selling points (no external APIs)
  const selling = buildSellingPoints(lane);

  return (
    <div className="rounded-xl border border-gray-700 bg-[#0f1115] p-4 shadow">
      <div className="mb-2 text-sm uppercase tracking-wide text-gray-400">{lane.status}</div>
      <div className="mb-1 font-semibold text-gray-100">{laneText}</div>
      <div className="mb-2 text-sm text-gray-300">{lane.equipment} • {lane.length} ft • {weightText}</div>
      <div className="mb-3 text-xs text-gray-400">Pickup: {win(lane.pickup_earliest, lane.pickup_latest)}</div>

      {lane.commodity && (
        <div className="mb-2 text-sm text-gray-200">Commodity: <span className="text-gray-300">{lane.commodity}</span></div>
      )}
      {lane.comment && (
        <div className="mb-3 text-sm text-gray-200">Note: <span className="text-gray-300">{lane.comment}</span></div>
      )}

      <ul className="mb-2 list-disc pl-5 text-sm text-gray-300">
        {selling.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
    </div>
  );
}

function buildSellingPoints(l) {
  const pts = [];
  // Equipment-aware anchor
  if (/^R/i.test(l.equipment)) pts.push("Reefer-friendly timing and metro coverage.");
  else if (/^(F|SD|DD|RGN)/i.test(l.equipment)) pts.push("Flatbed lanes with reliable steel/industrial demand.");
  else pts.push("Van distribution metros with reload options.");

  // Window tightness
  if (l.pickup_earliest && l.pickup_latest && l.pickup_earliest === l.pickup_latest) {
    pts.push("One-day pickup window for faster tendering.");
  } else if (l.pickup_earliest && l.pickup_latest) {
    pts.push("Flexible pickup window to increase carrier matches.");
  }

  // Weight
  if (!l.randomize_weight && l.weight && Number(l.weight) <= 43000) {
    pts.push("Weight-friendly — typically under 43k.");
  } else if (l.randomize_weight && l.weight_max && Number(l.weight_max) <= 43000) {
    pts.push("Weight range suitable for more carriers.");
  }

  // General reload heuristic
  pts.push("Balanced markets to support reloads and minimize deadhead.");

  return pts.slice(0, 4);
}

function fmtUS(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${m}/${d}/${y}`;
}
