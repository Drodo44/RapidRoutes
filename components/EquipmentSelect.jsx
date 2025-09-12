// components/EquipmentSelect.js
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../utils/supabaseClient.js";
import { DAT_EQUIPMENT } from "../data/datEquipment.js";

function groupBy(arr, key) {
  return arr.reduce((m, x) => {
    (m[x[key] || "Other"] ||= []).push(x);
    return m;
  }, {});
}

export default function EquipmentSelect({ value, onChange }) {
  const [remote, setRemote] = useState(null); // optional: equipment_codes table
  const code = String(value || "").toUpperCase();

  useEffect(() => {
    // Optional: if you create a `equipment_codes` table (code, label, group),
    // this will merge it with the built-in list at runtime.
    (async () => {
      try {
        const { data, error } = await supabase.from("equipment_codes").select("*").limit(200);
        if (!error && Array.isArray(data)) setRemote(data.map((d) => ({
          code: String(d.code).toUpperCase(),
          label: d.label || d.code,
          group: d.group || "Other",
        })));
      } catch { /* no-op */ }
    })();
  }, []);

  const OPTIONS = useMemo(() => {
    const base = DAT_EQUIPMENT.map((x) => ({ ...x, code: x.code.toUpperCase() }));
    const extra = (remote || []).filter((r) => !base.some((b) => b.code === r.code));
    return [...base, ...extra].sort((a, b) => a.code.localeCompare(b.code));
  }, [remote]);

  const known = OPTIONS.find((o) => o.code === code);
  const label = known?.label || "Custom DAT code";
  const groups = useMemo(() => groupBy(OPTIONS, "group"), [OPTIONS]);

  return (
    <div className="flex w-full items-center gap-3">
      <div className="flex-1">
        <select
          value={known ? known.code : ""}
          onChange={(e) => onChange(e.target.value || code)}
          className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white"
        >
          <option value="">Custom…</option>
          {Object.keys(groups).sort().map((g) => (
            <optgroup key={g} label={g}>
              {groups[g].map((o) => (
                <option key={o.code} value={o.code}>
                  {o.code} — {o.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="w-40">
        <input
          value={code}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="DAT code (e.g., F, R, V)"
          className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white"
        />
      </div>
      <div className="text-xs text-gray-400 whitespace-nowrap">{label}</div>
    </div>
  );
}
