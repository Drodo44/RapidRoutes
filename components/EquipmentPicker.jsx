// components/EquipmentPicker.jsx
// Code-first equipment picker powered by `equipment_codes` table.
// - Broker types DAT code (e.g., "FD"); we show label read-only.
// - Emits onChange(code) with uppercase normalized code.

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function EquipmentPicker({
  id = 'equipment',
  label = 'Equipment (DAT Code)',
  code,
  onChange, // (code) => void
  required = true,
}) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    supabase
      .from('equipment_codes')
      .select('code,label')
      .order('code', { ascending: true })
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          console.error('equipment_codes fetch error', error);
          setList([]);
        } else {
          setList(data || []);
        }
      })
      .finally(() => setLoading(false));
    return () => (mounted = false);
  }, []);

  const map = useMemo(() => {
    const m = new Map();
    for (const r of list) m.set(String(r.code).toUpperCase(), r.label);
    return m;
  }, [list]);

  const normalized = String(code || '').toUpperCase();
  const labelText = normalized && map.get(normalized);

  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-sm text-gray-300 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="text"
          inputMode="text"
          maxLength={6}
          value={normalized}
          required={required}
          onChange={(e) => onChange?.(e.target.value.toUpperCase())}
          className="w-32 rounded-lg bg-[#0b0d12] border border-gray-700 px-3 py-2 text-gray-100 outline-none focus:border-gray-500"
          placeholder="FD"
        />
        <div className="text-sm text-gray-400 min-h-[1.75rem] flex items-center">
          {loading ? 'Loading…' : labelText ? `→ ${labelText}` : 'Type a DAT code'}
        </div>
      </div>
    </div>
  );
}
