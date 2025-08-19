// pages/recap.js
// Active-lanes recap (pending or posted), compact cards, search, and export view launcher.
// Selling points & risk flags use deterministic heuristics (no external APIs).

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

function matches(q, l) {
  if (!q) return true;
  const s = q.toLowerCase();
  return (
    `${l.origin_city}, ${l.origin_state}`.toLowerCase().includes(s) ||
    `${l.dest_city}, ${l.dest_state}`.toLowerCase().includes(s) ||
    String(l.equipment_code).toLowerCase().includes(s)
  );
}

// Simple deterministic heuristics for selling points / risk flags
function heuristics(l) {
  const eq = String(l.equipment_code || '').toUpperCase();
  const os = String(l.origin_state || '').toUpperCase();
  const ds = String(l.dest_state || '').toUpperCase();

  const selling = [];
  const risks = [];

  // Equipment-based hints
  if (eq === 'FD' || eq === 'F' || eq === 'SD') {
    selling.push('Strong open-deck demand near steel & fabrication corridors.');
  }
  if (eq === 'R' || eq === 'CR' || eq === 'IR') {
    selling.push('Steady reefer flow; leverage food & beverage distribution hubs.');
  }
  if (eq === 'V') {
    selling.push('High van density; fast coverage via major DC networks.');
  }

  // State-to-state nudge (static, deterministic)
  const east = new Set(['OH','PA','NY','VA','NC','SC','GA','FL','MI','IL','IN','WI','TN','KY','AL']);
  const south = new Set(['TX','OK','LA','AR','NM']);
  const west = new Set(['CA','AZ','NV','UT','WA','OR','ID','CO']);

  if (east.has(os) && east.has(ds)) {
    selling.push('Short-haul coverage strong across Eastern corridors; quick turn potential.');
  } else if (south.has(os) || south.has(ds)) {
    selling.push('Energy & construction lanes support pricing leverage.');
  } else if (west.has(os) || west.has(ds)) {
    selling.push('Port & intermodal access supports reloads.');
  }

  // Light volatility flags (deterministic placeholders)
  if (eq === 'FD' && (ds === 'MI' || ds === 'PA' || ds === 'OH')) {
    risks.push('Watch steel volatility / mill schedules.');
  }
  if ((eq === 'R' || eq === 'IR') && (ds === 'FL' || ds === 'TX' || ds === 'CA')) {
    risks.push('Produce seasonality may shift capacity week to week.');
  }

  return {
    selling: Array.from(new Set(selling)).slice(0, 3),
    risks: Array.from(new Set(risks)).slice(0, 3),
  };
}

export default function RecapPage() {
  const [q, setQ] = useState('');
  const [lanes, setLanes] = useState([]);

  async function load() {
    const { data, error } = await supabase
      .from('lanes')
      .select('*')
      .in('status', ['pending', 'posted'])
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      console.error(error);
      setLanes([]);
      return;
    }
    setLanes(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => (lanes || []).filter((l) => matches(q, l)), [lanes, q]);

  function openExportView() {
    // Opens print-friendly HTML view (implemented in Drop 5 as /recap-export)
    const ids = filtered.map((l) => l.id).join(',');
    const url = `/recap-export?ids=${encodeURIComponent(ids)}`;
    window.open(url, '_blank');
  }

  return (
    <div className="mx-auto max-w-7xl px-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-100">Recap</h1>
        <div className="flex gap-2">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search city, state, or equipment"
            className="w-64 rounded-lg bg-[#0b0d12] border border-gray-700 px-3 py-2 text-gray-100 outline-none focus:border-gray-500"
          />
          <button onClick={openExportView} className="btn-secondary">Open Export View</button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((l) => {
          const h = heuristics(l);
          return (
            <article key={l.id} className="rounded-xl border border-gray-800 bg-[#0f1115] p-4">
              <div className="text-gray-100">
                <div className="flex items-center justify-between">
                  <div className="font-medium">
                    {l.origin_city}, {l.origin_state}
                    <span className="mx-2 text-gray-500">→</span>
                    {l.dest_city}, {l.dest_state}
                  </div>
                  <div className="text-xs text-gray-400">{l.status}</div>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  [{l.equipment_code} • {l.length_ft}ft] · {l.randomize_weight ? `${l.weight_min}-${l.weight_max} lbs` : `${l.weight_lbs} lbs`}
                </div>
              </div>

              {h.selling.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {h.selling.map((s, i) => (
                    <li key={i} className="text-sm text-gray-200">• {s}</li>
                  ))}
                </ul>
              )}

              {h.risks.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-gray-400 mb-1">Risk flags</div>
                  <ul className="space-y-1">
                    {h.risks.map((s, i) => (
                      <li key={i} className="text-xs text-amber-300">• {s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {l.comment && (
                <div className="mt-3 text-xs text-gray-300">
                  Note: {l.comment}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-sm text-gray-400">No active lanes match your search.</div>
      )}

      <style jsx>{`
        .btn-secondary {
          @apply rounded-lg border border-gray-700 px-3 py-1.5 text-gray-200 hover:bg-gray-800;
        }
      `}</style>
    </div>
  );
}
