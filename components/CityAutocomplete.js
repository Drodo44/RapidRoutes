// components/CityAutocomplete.js
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../utils/supabaseClient.js";

export default function CityAutocomplete({ label, value, onChange, onPick }) {
  const [q, setQ] = useState(value || "");
  const [opts, setOpts] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => setQ(value || ""), [value]);

  useEffect(() => {
    const id = setTimeout(async () => {
      const term = q.trim();
      if (!term) { setOpts([]); return; }
      const cityPrefix = term.split(",")[0].trim();
      const { data } = await supabase
        .from("cities")
        .select("id, city, state_or_province, zip")
        .ilike("city", `${cityPrefix}%`)
        .limit(12);
      setOpts(data || []);
      setOpen(true);
    }, 200);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const pick = (c) => {
    const val = `${c.city}, ${c.state_or_province}`;
    onChange?.(val);
    onPick?.(c); // exposes state + zip if needed
    setQ(val);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <label className="mb-1 block text-xs text-gray-400">{label}</label>
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); onChange?.(e.target.value); }}
        onFocus={() => q && setOpen(true)}
        className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white"
        placeholder="City, ST"
      />
      {open && opts.length > 0 && (
        <div className="absolute z-10 mt-1 w-full overflow-auto rounded-lg border border-gray-700 bg-gray-900 text-sm">
          {opts.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(c)}
              className="block w-full text-left px-3 py-2 hover:bg-gray-800"
            >
              {c.city}, {c.state_or_province}
              {c.zip ? <span className="text-xs text-gray-400">  · {c.zip}</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
