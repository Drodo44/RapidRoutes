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
      <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Admin Upload – Rate Matrices</h1>

      <div className="rounded-xl p-4 space-y-4" style={{ border: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Equipment</label>
            <select value={equipment} onChange={(e) => setEquipment(e.target.value)} className="select">
              <option value="van">van</option>
              <option value="reefer">reefer</option>
              <option value="flatbed">flatbed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Level</label>
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="select">
              <option value="state">state</option>
              <option value="region">region</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Source</label>
            <select value={source} onChange={(e) => setSource(e.target.value)} className="select">
              <option value="avg">avg</option>
              <option value="spot">spot</option>
              <option value="contract">contract</option>
            </select>
          </div>
          <label className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={denorm} onChange={(e) => setDenorm(e.target.checked)} className="accent-gray-300" />
            Denormalize to rates_flat
          </label>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="rounded-lg border border-dashed p-6 text-center"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}
        >
          Drag & Drop CSV here or
          <label className="ml-2 underline cursor-pointer">
            select a file<input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFilesSelected(e.target.files)} />
          </label>
        </div>

        {msg && <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{msg}</div>}

        {rowsPreview.length > 0 && (
          <div className="rounded-lg p-3" style={{ border: 'var(--border)' }}>
            <div className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>Preview (first 20 rows)</div>
            <div className="grid grid-cols-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <div className="font-mono">Origin</div>
              <div className="font-mono">Destination</div>
              <div className="font-mono">Rate</div>
            </div>
            {rowsPreview.map((r, i) => (
              <div key={i} className="grid grid-cols-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <div>{r.origin}</div>
                <div>{r.destination}</div>
                <div>{r.rate}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .select { 
          width: 100%;
          border-radius: var(--radius);
          background: var(--bg-tertiary);
          border: var(--border);
          padding: 0.5rem 0.75rem;
          color: var(--text-primary);
          outline: none;
        }
        .select:focus {
          border-color: var(--primary);
        }
      `}</style>
    </div>
  );
}
