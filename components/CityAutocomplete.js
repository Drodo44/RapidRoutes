// components/CityAutocomplete.js
import { useEffect, useMemo, useRef, useState } from "react";

export default function CityAutocomplete({ label, value, onChange, onPick }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [idx, setIdx] = useState(-1);
  const boxRef = useRef(null);
  const listRef = useRef(null);

  const canQuery = (v) => (v?.trim()?.length || 0) >= 2;

  useEffect(() => {
    let active = true;
    const v = value || "";
    if (!canQuery(v)) { setItems([]); return; }
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const r = await fetch(`/api/cities?q=${encodeURIComponent(v)}`);
        const j = await r.json();
        if (!active) return;
        if (Array.isArray(j)) setItems(j);
        setOpen(true);
        setIdx(-1);
      } catch {
        if (active) setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 150); // small debounce
    return () => { active = false; clearTimeout(t); };
  }, [value]);

  useEffect(() => {
    function onDocClick(e) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(it) {
    onChange?.(it.label);
    onPick?.(it); // { city, state, zip }
    setOpen(false);
  }

  function onKey(e) {
    if (!open || !items.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(items.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const it = items[idx] || items[0];
      if (it) pick(it);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const list = useMemo(() => items.slice(0, 12), [items]);

  return (
    <div className="relative" ref={boxRef}>
      <label className="mb-1 block text-xs text-gray-400">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => canQuery(value) && setOpen(true)}
        onKeyDown={onKey}
        className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white"
        placeholder="City, ST"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      {open && list.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-700 bg-[#0f1115] shadow"
        >
          {list.map((it, i) => (
            <button
              key={`${it.city}-${it.state}-${i}`}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(it); }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                i === idx ? "bg-gray-800 text-white" : "text-gray-200 hover:bg-gray-800"
              }`}
            >
              <span className="inline-block h-4 w-4 rounded-sm bg-gray-600" />
              <span className="flex-1">{it.label}</span>
              {it.zip && <span className="text-xs text-gray-400">{it.zip}</span>}
            </button>
          ))}
          {loading && <div className="px-3 py-2 text-sm text-gray-400">Searching…</div>}
        </div>
      )}
    </div>
  );
}
