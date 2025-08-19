// components/EquipmentPicker.jsx
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function EquipmentPicker({ id='equipment', label='Equipment Type', code, onChange, required=true }) {
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const selected = String(code || '').toUpperCase();

  useEffect(() => {
    let mounted = true;

    async function ensureSeedAndLoad() {
      try {
        // Self-seed (idempotent, server-side)
        await fetch('/api/bootstrapEquipment', { method: 'POST' });
      } catch { /* non-fatal */ }

      const { data, error } = await supabase
        .from('equipment_codes')
        .select('code,label')
        .order('label', { ascending: true });
      if (!mounted) return;
      if (error) { console.error(error); setList([]); }
      else setList(data || []);
    }

    ensureSeedAndLoad();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(r => r.label.toLowerCase().includes(s) || String(r.code).toLowerCase().includes(s));
  }, [list, q]);

  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-sm text-gray-300 mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search type or code…"
          className="w-full rounded-lg bg-[#0b0d12] border border-gray-700 px-3 py-2 text-gray-100 outline-none focus:border-gray-500"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
        />
        <select
          id={id}
          required={required}
          value={selected}
          onChange={(e)=>onChange?.(e.target.value)}
          className="min-w-[16rem] rounded-lg bg-[#0b0d12] border border-gray-700 px-3 py-2 text-gray-100 outline-none focus:border-gray-500"
        >
          <option value="" disabled>Select equipment…</option>
          {filtered.map(r => (
            <option key={r.code} value={r.code}>
              {r.label} — {r.code}
            </option>
          ))}
        </select>
      </div>
      {selected && <div className="text-xs text-gray-400 mt-1">Selected: <span className="font-mono">{selected}</span></div>}
    </div>
  );
}
