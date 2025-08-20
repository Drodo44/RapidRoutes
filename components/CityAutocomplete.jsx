// components/CityAutocomplete.jsx
import { useEffect, useRef, useState } from 'react';

export default function CityAutocomplete({
  id,
  label = 'City, ST',
  value,
  onChange,
  onPick,
  disabled = false,
  required = true,
  autoFocus = false,
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [hi, setHi] = useState(-1);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);
  const blurRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort?.(), []);

  useEffect(() => {
    if (!value || value.length < 2) { setItems([]); setOpen(false); setHi(-1); return; }
    abortRef.current?.abort?.();
    const ctrl = new AbortController(); abortRef.current = ctrl;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cities?q=${encodeURIComponent(value)}`, { signal: ctrl.signal });
        const json = await res.json();
        setItems(Array.isArray(json) ? json : []);
        setHi(json?.length ? 0 : -1);
        setOpen(true);
      } catch { /* ignore */ } finally { setLoading(false); }
    }, 140);
    return () => clearTimeout(t);
  }, [value]);

  function pick(row){
    onPick?.(row);
    onChange?.(`${row.city}, ${row.state}`);
    setOpen(false); setHi(-1);
  }

  function key(e){
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min((items.length-1), h+1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(0, h-1)); }
    else if (e.key === 'Enter' && hi >= 0 && items[hi]) { e.preventDefault(); pick(items[hi]); }
    else if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm text-gray-300 mb-1">{label}</label>
      <div className="relative">
        <input
          id={id}
          value={value}
          onChange={(e)=>onChange?.(e.target.value)}
          onKeyDown={key}
          onFocus={()=>{ clearTimeout(blurRef.current); if(value && value.length >= 2) setOpen(true); }}
          onBlur={()=>{ blurRef.current = setTimeout(()=>setOpen(false), 120); }}
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
          placeholder='City, ST (or ZIP)'
          className="w-full rounded-lg bg-gray-800 border border-gray-600 px-3 py-2 text-gray-100 outline-none focus:border-gray-500"
          autoComplete="off"
          spellCheck={false}
        />
        {loading && (
          <div className="absolute right-3 top-2">
            <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>
      {open && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-600 bg-gray-800 shadow-lg">
          {loading && !items.length && <li className="px-3 py-2 text-sm text-gray-300">Searching…</li>}
          {!loading && items.length === 0 && <li className="px-3 py-2 text-sm text-gray-300">No matches</li>}
          {!loading && items.map((it, i) => {
            const active = i === hi;
            return (
              <li
                key={`${it.id}-${i}`}
                role="option"
                aria-selected={active ? 'true':'false'}
                className={`px-3 py-2 text-sm cursor-pointer flex items-center gap-2 ${active ? 'bg-blue-600 text-white' : 'text-gray-200 hover:bg-gray-700'}`}
                onMouseEnter={()=>setHi(i)}
                onMouseDown={(e)=>{ e.preventDefault(); pick(it); }}
              >
                <span className="text-gray-300">📍</span>
                <span>{it.city}, {it.state}{it.zip ? ` ${it.zip}` : ''}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
