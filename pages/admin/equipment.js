// pages/admin/equipment.js
// Admin: manage equipment codes. Paste CODE,Label lines, "Load DAT Seed", Upsert.

import { useEffect, useState } from 'react';
import supabase from '../../utils/supabaseClient';

const SEED_LINES = [
  // Core van/reefer/flatbed
  'V, Dry Van',
  'R, Reefer',
  'F, Flatbed',
  'FD, Flatbed or Step Deck',
  'SD, Step Deck',
  'DD, Double Drop',
  'LB, Lowboy',
  'LR, Lowboy or Rem Gooseneck (RGN)',
  'LO, Lowboy Over Dimension',
  'FN, Flatbed Conestoga',
  'FA, Flatbed Air-Ride',
  'F2, Flatbed Double',
  'FZ, Flatbed HazMat',
  'FO, Flatbed Over Dimension',
  'FC, Flatbed w/Chains',
  'FS, Flatbed w/Sides',
  'FT, Flatbed w/Tarps',
  'FM, Flatbed w/Team',
  'MX, Flatbed Maxi',
  'FR, Flatbed/Van/Reefer',
  'IR, Insulated Van or Reefer',
  // Container / specialized
  'C, Container',
  'CI, Container Insulated',
  'CR, Container Refrigerated',
  'CN, Conestoga',
  'CV, Conveyor',
  'DT, Dump Trailer',
  'HB, Hopper Bottom',
  'LA, Drop Deck Landoll',
  'AC, Auto Carrier',
  'BT, B-Train',
  // Common additional variants seen on DAT
  'VZ, Van HazMat',
  'RZ, Reefer HazMat',
  'HZ, HazMat (General)',
  'TN, Tanker (Non-food)',
  'TF, Tanker (Food Grade)',
  'RG, Removable Gooseneck',
  'ST, Straight Truck',
  'HS, Hotshot',
  'PU, Pickup Truck',
  'XL, Over Dimension (General)',
  'ES, Escort/Pilot Car',
  'PO, Power Only',
  'FSF, Flatbed w/Sides & Forklift',
  'CH, Chassis',
  'IM, Intermodal',
  'TR, Trailer (Generic)',
  'DV, Dry Van (Alt Code)',
  'RV, Reefer Van (Alt Code)',
  'SDX, Step Deck (Extended)',
  'DDX, Double Drop (Extended)',
  // Additions frequently requested
  'RGN, Removable Gooseneck (Alt)',
  'LBX, Lowboy (Extended)',
  'FL, Flatbed Light',
  'FH, Flatbed Hotshot',
];

export default function EquipmentAdmin() {
  const [text, setText] = useState('');
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    const { data, error } = await supabase
      .from('equipment_codes')
      .select('code,label')
      .order('code', { ascending: true });
    if (error) {
      console.error(error);
      setList([]);
    } else {
      setList(data || []);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function loadSeed() {
    setText(SEED_LINES.join('\n'));
  }

  function parseLines(input) {
    const out = [];
    for (const raw of String(input || '').split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      const [code, ...rest] = line.split(',');
      if (!code || rest.length === 0) continue;
      const label = rest.join(',').trim();
      out.push({ code: code.trim().toUpperCase(), label });
    }
    return out;
  }

  async function save() {
    const rows = parseLines(text);
    if (!rows.length) {
      setMsg('No valid lines to import.');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      // Upsert in batches
      const chunkSize = 100;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await supabase.from('equipment_codes').upsert(chunk, { onConflict: 'code' });
        if (error) throw error;
      }
      setMsg(`Saved ${rows.length} codes.`);
      await load();
    } catch (e) {
      setMsg(e.message || 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 space-y-6">
      <h1 className="text-lg font-semibold text-gray-100">Equipment Codes</h1>

      <div className="rounded-xl border border-gray-800 bg-[#0f1115] p-4 space-y-3">
        <div className="flex gap-2">
          <button onClick={loadSeed} className="btn-secondary">Load DAT Seed</button>
          <button onClick={save} disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Save / Upsert'}</button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="CODE, Label"
          rows={10}
          className="w-full rounded-lg bg-[#0b0d12] border border-gray-700 px-3 py-2 text-gray-100 outline-none focus:border-gray-500"
        />
        {msg && <div className="text-sm text-gray-300">{msg}</div>}
      </div>

      <div className="rounded-xl border border-gray-800 bg-[#0f1115] p-4">
        <h2 className="text-sm text-gray-300 mb-3">Existing Codes</h2>
        <div className="grid md:grid-cols-2 gap-2">
          {list.map((r) => (
            <div key={r.code} className="text-sm text-gray-200">
              <span className="font-mono text-gray-300 mr-2">{r.code}</span> {r.label}
            </div>
          ))}
          {list.length === 0 && <div className="text-sm text-gray-400">No codes yet.</div>}
        </div>
      </div>

      <style jsx>{`
        .btn-primary { @apply rounded-lg bg-gray-100 text-black font-medium px-4 py-2 hover:bg-white disabled:opacity-60; }
        .btn-secondary { @apply rounded-lg border border-gray-700 px-3 py-1.5 text-gray-200 hover:bg-gray-800; }
      `}</style>
    </div>
  );
}
