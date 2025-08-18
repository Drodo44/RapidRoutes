// components/EquipmentAutocomplete.js
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../utils/supabaseClient";

const FALLBACK = [
  { code: "V", label: "Dry Van" },
  { code: "R", label: "Reefer" },
  { code: "F", label: "Flatbed" },
  { code: "SD", label: "Step Deck" },
  { code: "DD", label: "Double Drop" },
  { code: "RGN", label: "Removable Gooseneck" },
];

export default function EquipmentAutocomplete({ value, onChange }) {
  const [all, setAll] = useState(FALLBACK);
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from("equipment_codes").select("code,label").order("code", { ascending: true }).limit(2000);
      if (!alive) return;
      if (data?.length) setAll(data.map((r) => ({ code: r.code.toUpperCase(), label: r.label })));
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return all;
    return all.filter(({ code, label }) => code.toLowerCase().includes(s) || label.toLowerCase().includes(s));
  }, [all, q]);

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        onFocus={(e) => setQ(e.target.value)}
        onKeyUp={(e) => setQ(e.currentTarget.value)}
        className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white"
        placeholder="DAT code (e.g., V, R, F, SD)"
      />
      <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-700 bg-[#0f1115] shadow">
        {filtered.slice(0, 30).map((opt) => (
          <button
            key={opt.code}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onChange(opt.code); }}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-800"
            title={opt.label}
          >
            <span className="font-semibold">{opt.code}</span>
            <span className="ml-3 text-gray-400">{opt.label}</span>
          </button>
        ))}
        {!filtered.length && <div className="px-3 py-2 text-sm text-gray-400">Type code or add at /admin/equipment</div>}
      </div>
    </div>
  );
}
