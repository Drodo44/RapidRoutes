// components/EquipmentAutocomplete.js
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../utils/supabaseClient.js";
import { DAT_EQUIPMENT } from "../data/datEquipment.js";

function fuse(items, q) {
  const t = q.trim().toLowerCase();
  if (!t) return items.slice(0, 20);
  return items
    .map((x) => ({ x, s:
      (x.code.toLowerCase().includes(t) ? 2 : 0) +
      ((x.label || "").toLowerCase().includes(t) ? 1 : 0)
    }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || a.x.code.localeCompare(b.x.code))
    .map((r) => r.x)
    .slice(0, 20);
}

export default function EquipmentAutocomplete({ value, onChange }) {
  const [remote, setRemote] = useState([]);
  const [q, setQ] = useState(String(value || "").toUpperCase());
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // merge built-in + remote table (optional)
  const options = useMemo(() => {
    const base = DAT_EQUIPMENT.map((o) => ({ ...o, code: o.code.toUpperCase() }));
    const extra = (remote || []).filter((r) => !base.some((b) => b.code === String(r.code).toUpperCase()))
      .map((r) => ({ code: String(r.code).toUpperCase(), label: r.label || r.code, group: r.group || "Other" }));
    return [...base, ...extra];
  }, [remote]);

  useEffect(() => {
    // optional live list from Supabase (if table exists)
    (async () => {
      try {
        const { data } = await supabase.from("equipment_codes").select("*").limit(500);
        if (Array.isArray(data)) setRemote(data);
      } catch { /* ignore if table/policy missing */ }
    })();
  }, []);

  useEffect(() => {
    setQ(String(value || "").toUpperCase());
  }, [value]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const list = useMemo(() => fuse(options, q), [options, q]);

  function pick(code) {
    const c = String(code || "").toUpperCase();
    onChange?.(c);
    setQ(c);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-2">
        <input
          value={q}
          onChange={(e) => { const v = e.target.value.toUpperCase(); setQ(v); onChange?.(v); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Type DAT code or name (e.g., RGN, Reefer, Flatbed)"
          className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white"
        />
        <span className="text-xs text-gray-400">
          {(options.find((o) => o.code === q)?.label) || "Custom DAT code"}
        </span>
      </div>

      {open && list.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-gray-700 bg-gray-900 text-sm">
          {list.map((o) => (
            <button
              key={o.code}
              type="button"
              onClick={() => pick(o.code)}
              className="block w-full px-3 py-2 text-left hover:bg-gray-800"
            >
              <span className="font-semibold">{o.code}</span>
              <span className="text-gray-400"> — {o.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
