// pages/recap-export.js
// Print-friendly HTML export for Recap. Accepts ?ids=<comma-separated UUIDs>.
// Fetches lanes client-side and renders compact, printable cards.

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function RecapExport() {
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    const idsParam = url.searchParams.get('ids');
    const ids = idsParam ? idsParam.split(',').map((s) => s.trim()).filter(Boolean) : [];
    async function run() {
      setLoading(true);
      if (ids.length === 0) {
        // fallback to active lanes
        const { data } = await supabase.from('lanes').select('*').in('status', ['pending', 'posted']).limit(200);
        setLanes(data || []);
        setLoading(false);
        return;
      }
      const { data } = await supabase.from('lanes').select('*').in('id', ids).limit(500);
      setLanes(data || []);
      setLoading(false);
    }
    run();
  }, []);

  const printNow = () => window.print();

  const groups = useMemo(() => {
    // group by equipment to provide a little structure
    const m = new Map();
    for (const l of lanes) {
      const k = (l.equipment_code || 'Other').toUpperCase();
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(l);
    }
    return Array.from(m.entries());
  }, [lanes]);

  return (
    <div className="p-6 bg-[#0b0d12] text-gray-100 min-h-screen">
      <div className="no-print mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">RapidRoutes – Recap Export</h1>
        <button onClick={printNow} className="rounded-lg bg-gray-100 text-black font-medium px-4 py-2 hover:bg-white">Print</button>
      </div>

      {loading && <div className="text-sm text-gray-400">Loading…</div>}

      {!loading && groups.map(([equip, arr]) => (
        <section key={equip} className="mb-6">
          <h2 className="text-sm text-gray-300 mb-2">{equip}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {arr.map((l) => (
              <article key={l.id} className="rounded-lg border border-gray-800 p-3 bg-[#0f1115]">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{l.origin_city}, {l.origin_state} <span className="text-gray-500">→</span> {l.dest_city}, {l.dest_state}</div>
                  <div className="text-xs text-gray-400">{l.status}</div>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  [{l.equipment_code} • {l.length_ft}ft] · {l.randomize_weight ? `${l.weight_min}-${l.weight_max} lbs` : `${l.weight_lbs} lbs`}
                  <span className="ml-2">Pickup: {l.pickup_earliest} → {l.pickup_latest}</span>
                </div>
                {l.comment && <div className="text-xs text-gray-300 mt-2">Note: {l.comment}</div>}
              </article>
            ))}
          </div>
        </section>
      ))}

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
