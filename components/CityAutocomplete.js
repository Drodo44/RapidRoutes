// components/CityAutocomplete.js
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function CityAutocomplete({ label, value, onSelect }) {
  const [q, setQ] = useState(value || "");
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const debounced = useDebounce(q, 200);

  useEffect(() => {
    async function run() {
      const term = debounced.trim();
      if (!term || term.length < 2) {
        setItems([]);
        return;
      }
      const [city, state] = term.split(",").map((s) => s?.trim());
      let query = supabase
        .from("cities")
        .select("id, city, state_or_province, postal_code")
        .ilike("city", `${city}%`)
        .limit(12);
      if (state) query = query.ilike("state_or_province", `${state}%`);
      const { data } = await query;
      setItems(
        (data || []).map((c) => ({
          id: c.id,
          city: c.city,
          state: c.state_or_province,
          zip: c.postal_code || "",
        }))
      );
    }
    run();
  }, [debounced]);

  useEffect(() => {
    function onDoc(e) {
      if (!boxRef.current || boxRef.current.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const choose = (c) => {
    const text = `${c.city}, ${c.state}`;
    setQ(text);
    setOpen(false);
    onSelect?.(c);
  };

  return (
    <div className="relative" ref={boxRef}>
      {label && <label className="mb-1 block text-xs text-gray-400">{label}</label>}
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="City, ST"
        className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white"
      />
      {open && items.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-700 bg-[#0f1115] shadow-lg">
          {items.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => choose(c)}
              className="block w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-800"
            >
              {c.city}, {c.state} {c.zip ? `• ${c.zip}` : ""}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function useDebounce(val, ms) {
  const [v, setV] = useState(val);
  useEffect(() => {
    const t = setTimeout(() => setV(val), ms);
    return () => clearTimeout(t);
  }, [val, ms]);
  return v;
}
