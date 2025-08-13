// components/LaneRecapCard.js
import { useEffect, useState } from "react";
import { generateCrawlCities } from "../lib/datcrawl";
import PerLaneExportButton from "./PerLaneExportButton";

export default function LaneRecapCard({ lane, allowFill = false }) {
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const eq = String(lane.equipment || lane.equipment_code || "V").toUpperCase();
      const { pairs } = await generateCrawlCities(lane.origin, lane.destination, {
        equipment: eq,
        preferFillTo10: allowFill,
      });
      setPairs(pairs || []);
      setLoading(false);
    })();
  }, [lane, allowFill]);

  const weightText = lane.randomize_weight
    ? `${lane.weight_min}-${lane.weight_max}lbs`
    : `${lane.weight}lbs`;

  return (
    <div className="rounded-xl border border-gray-700 bg-[#0f1115] p-4">
      <div className="mb-2 flex items-start justify-between">
        <div className="text-sm text-gray-300">
          <div className="font-semibold text-white">
            {lane.origin} → {lane.destination}
          </div>
          <div className="mt-0.5">
            {lane.equipment} • {lane.length}ft • {weightText} • {lane.date}
          </div>
        </div>
        <PerLaneExportButton laneId={lane.id} fill={allowFill} />
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Generating…</div>
      ) : (
        <ul className="space-y-2">
          {pairs.slice(0, 10).map((p, idx) => (
            <li key={idx} className="rounded-lg border border-gray-700 bg-gray-900 p-3 text-sm">
              <div className="font-medium">
                {p.pickup.city}, {p.pickup.state} → {p.delivery.city}, {p.delivery.state}
              </div>
              <div className="mt-1 flex flex-wrap gap-1 text-xs text-gray-300">
                {p.reason.map((r) => (
                  <span key={r} className="rounded bg-gray-700 px-2 py-0.5">
                    {r}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
