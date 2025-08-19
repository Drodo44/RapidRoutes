// components/CityAutocomplete.jsx
// Accessible "City, ST" autocomplete backed by /api/cities.
// - Up to 12 suggestions
// - Keyboard nav (↑/↓/Enter/Esc)
// - Calls onPick({ id, city, state, zip, label })

import { useEffect, useRef, useState } from 'react';

export default function CityAutocomplete({
  id,
  label = 'City, ST',
  placeholder = 'Start typing "City, ST"',
  value,             // string value "City, ST"
  onChange,          // (string) => void
  onPick,            // ({id, city, state, zip, label}) => void
  disabled = false,
  required = true,
  autoFocus = false,
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [highlight, setHighlight] = useState(-1);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);
  const listRef = useRef(null);
  const blurTimer = useRef(null);
  const controllerRef = useRef(null);

  useEffect(() => () => controllerRef.current?.abort?.(), []);

  useEffect(() => {
    if (!value || value.length < 2) {
      setItems([]);
      setOpen(false);
      setHighlight(-1);
      return;
    }
    const run = async () => {
      try {
        controllerRef.current?.abort?.();
        const ctrl = new AbortController();
        controllerRef.current = ctrl;

        setLoading(true);
        const res = await fetch(`/api/cities?q=${encodeURIComponent(value)}`, {
          signal: ctrl.signal,
        });
        const json = await res.json();
        setItems(Array.isArray(json) ? json : []);
        setOpen(true);
        setHighlight(json?.length ? 0 : -1);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    const t = setTimeout(run, 150);
    return () => clearTimeout(t);
  }, [value]);

  function onKeyDown(e) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min((items?.length ?? 0) - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      if (highlight >= 0 && items[highlight]) {
        e.preventDefault();
        pick(items[highlight]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  function pick(item) {
    onPick?.(item);
    onChange?.(`${item.city}, ${item.state}`);
    setOpen(false);
    setHighlight(-1);
  }

  function onBlur() {
    // small delay so click can register
    blurTimer.current = setTimeout(() => setOpen(false), 120);
  }

  function onFocus() {
    clearTimeout(blurTimer.current);
    if (items.length) setOpen(true);
  }

  return (
    <div className="relative" ref={boxRef}>
      <label htmlFor={id} className="block text-sm text-gray-300 mb-1">
        {label}
      </label>
      <input
        id={id}
        type="text"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        onFocus={onFocus}
        aria-expanded={open ? 'true' : 'false'}
        aria-controls={`${id}-listbox`}
        className="w-full rounded-lg bg-[#0b0d12] border border-gray-700 px-3 py-2 text-gray-100 outline-none focus:border-gray-500"
        placeholder={placeholder}
      />

      {open && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          ref={listRef}
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-700 bg-[#0f1115] shadow-lg"
        >
          {loading && (
            <li className="px-3 py-2 text-sm text-gray-400">Searching…</li>
          )}
          {!loading && items.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-400">No matches</li>
          )}
          {!loading &&
            items.map((it, i) => {
              const active = i === highlight;
              return (
                <li
                  key={`${it.id}-${i}`}
                  role="option"
                  aria-selected={active ? 'true' : 'false'}
                  className={`px-3 py-2 text-sm cursor-pointer ${
                    active ? 'bg-gray-800 text-white' : 'text-gray-200 hover:bg-gray-800'
                  }`}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent input blur first
                    pick(it);
                  }}
                >
                  {it.label}
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
