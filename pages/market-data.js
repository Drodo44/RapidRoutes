// pages/market-data.js
// Admin upload for rate matrices. Client parses CSV via PapaParse and posts JSON to API.
// Supports state->state or region->region matrices.
// Options: equipment (van/reefer/flatbed), level (state|region), source (avg|spot|contract), optional denormalization.
//
// Install dependency if missing: `papaparse`
// (Your repo likely already has it; if not, add it. This page imports it client-side only.)

import { useEffect, useState } from 'react';
import Papa from 'papaparse';

export default function MarketDataPage() {
  const [equipment, setEquipment] = useState('van');
  const [level, setLevel] = useState('state');
  const [source, setSource] = useState('avg');
  const [denorm, setDenorm] = useState(true);
  const [msg, setMsg] = useState('');
  const [rowsPreview, setRowsPreview] = useState([]);

  function onFilesSelected(files) {
    if (!files || !files.length) return;
    const file = files[0];
    setMsg('Parsing CSV…');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const data = res.data || [];
        // Normalize common header variants
        const normalized = data.map((r) => {
          const origin = r.origin || r.Origin || r.ORIGIN || r.state_from || r.StateFrom || r.from || r.From;
          const destination = r.destination || r.Destination || r.DESTINATION || r.state_to || r.StateTo || r.to || r.To;
          const rate = r.rate || r.Rate || r.RATE || r.value || r.Value || r.avg || r.Average || r.AVG;
          return {
            origin: String(origin || '').trim().toUpperCase(),
            destination: String(destination || '').trim().toUpperCase(),
            rate: Number(rate),
          };
        }).filter((r) => r.origin && r.destination && Number.isFinite(r.rate));

        setRowsPreview(normalized.slice(0, 20));
        setMsg(`Parsed ${normalized.length} matrix rows. Ready to upload.`);
        upload(normalized);
      },
      error: (err) => {
        setMsg(`CSV parse failed: ${err.message || err}`);
      },
    });
  }

  async function upload(matrixRows) {
    setMsg((m) => m + ' Uploading…');
    try {
      const res = await fetch('/api/uploadMarketData', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipment,
          level,
          source,
          denormalize: !!denorm,
          matrixRows,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const j = await res.json();
      setMsg(`Upload complete. Snapshot #${j.snapshot_id}. Flat rows inserted: ${j.flat_rows || 0}.`);
    } catch (e) {
      setMsg(`Upload failed: ${e.message || e}`);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    onFilesSelected(e.dataTransfer.files);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 space-y-6">
      <h1 className="text-lg font-semibold text-gray-100">Admin Upload – Rate Matrices</h1>

      <div className="rounded-xl border border-gray-800 bg-[#0f1115] p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Equipment</label>
            <select value={equipment} onChange={(e) => setEquipment(e.target.value)} className="select">
              <option value="van">van</option>
              <option value="reefer">reefer</option>
              <option value="flatbed">flatbed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Level</label>
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="select">
              <option value="state">state</option>
              <option value="region">region</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Source</label>
            <select value={source} onChange={(e) => setSource(e.target.value)} className="select">
              <option value="avg">avg</option>
              <option value="spot">spot</option>
              <option value="contract">contract</option>
            </select>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={denorm} onChange={(e) => setDenorm(e.target.checked)} className="accent-gray-300" />
            Denormalize to rates_flat
          </label>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="rounded-lg border border-dashed border-gray-700 p-6 text-center text-gray-300 bg-[#0b0d12]"
        >
          Drag & Drop CSV here or
          <label className="ml-2 underline cursor-pointer">
            select a file<input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFilesSelected(e.target.files)} />
          </label>
        </div>

        {msg && <div className="text-sm text-gray-300">{msg}</div>}

        {rowsPreview.length > 0 && (
          <div className="rounded-lg border border-gray-800 p-3">
            <div className="text-xs text-gray-400 mb-2">Preview (first 20 rows)</div>
            <div className="grid grid-cols-3 text-xs text-gray-200">
              <div className="font-mono">Origin</div>
              <div className="font-mono">Destination</div>
              <div className="font-mono">Rate</div>
            </div>
            {rowsPreview.map((r, i) => (
              <div key={i} className="grid grid-cols-3 text-xs text-gray-300">
                <div>{r.origin}</div>
                <div>{r.destination}</div>
                <div>{r.rate}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .select { @apply w-full rounded-lg bg-[#0b0d12] border border-gray-700 px-3 py-2 text-gray-100 outline-none focus:border-gray-500; }
      `}</style>
    </div>
  );
}
