// components/CityAutocomplete.js
import { useEffect, useMemo, useRef, useState } from "react";
import CityNotFoundModal from './CityNotFoundModal';

export default function CityAutocomplete({ label, value, onChange, onPick }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [idx, setIdx] = useState(-1);
  const [showModal, setShowModal] = useState(false);
  const [modalCity, setModalCity] = useState(null);
  const [modalState, setModalState] = useState(null);
  const boxRef = useRef(null);

  const canQuery = (v) => (v?.trim()?.length || 0) >= 2;

  useEffect(() => {
    let active = true;
    const v = value || "";
    if (!canQuery(v)) { setItems([]); return; }
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        console.log('🔍 [CityAutocomplete] Searching for:', v);
        const r = await fetch(`/api/cities?q=${encodeURIComponent(v)}`);
        const j = await r.json();
        if (!active) return;
        
        const results = Array.isArray(j) ? j : [];
        console.log('🔍 [CityAutocomplete] Results:', results.length);
        setItems(results);
        
        // If no results found and input looks like "City, ST" format, show modal
        if (results.length === 0 && v.includes(',')) {
          const parts = v.split(',').map(p => p.trim());
          console.log('🔍 [CityAutocomplete] No results, checking format:', parts);
          if (parts.length === 2 && parts[0] && parts[1].length === 2) {
            console.log('🔍 [CityAutocomplete] Opening modal for:', parts[0], parts[1]);
            setModalCity(parts[0]);
            setModalState(parts[1].toUpperCase());
            setShowModal(true);
          }
        }
        
        setOpen(results.length > 0); 
        setIdx(-1);
      } finally {
        if (active) setLoading(false);
      }
    }, 150);
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
    else if (e.key === "Enter") { e.preventDefault(); pick(items[idx] || items[0]); }
    else if (e.key === "Escape") setOpen(false);
  }

  const handleCityAdded = (newCity) => {
    // Create the autocomplete item format
    const newItem = {
      city: newCity.city,
      state: newCity.state_or_province,
      zip: newCity.zip,
      label: `${newCity.city}, ${newCity.state_or_province}`
    };
    
    // Update the input and trigger onPick
    onChange?.(newItem.label);
    onPick?.(newItem);
    
    // Reset modal state
    setModalCity(null);
    setModalState(null);
  };

  const list = useMemo(() => items.slice(0, 12), [items]);

  return (
    <div style={{ position: 'relative' }} ref={boxRef}>
      <label className="form-label">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => canQuery(value) && setOpen(true)}
        onKeyDown={onKey}
        className="form-input"
        placeholder="City, ST"
        autoCapitalize="none" autoCorrect="off" spellCheck={false}
      />
      {open && list.length > 0 && (
        <div style={{
          position: 'absolute',
          zIndex: 20,
          marginTop: 'var(--space-1)',
          maxHeight: '240px',
          width: '100%',
          overflowY: 'auto',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-default)',
          backgroundColor: 'var(--surface)',
          boxShadow: 'var(--shadow-lg)'
        }}>
          {list.map((it, i) => (
            <button
              key={`${it.city}-${it.state}-${i}`}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(it); }}
              style={{
                display: 'flex',
                width: '100%',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-3)',
                textAlign: 'left',
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: i === idx ? 'var(--bg-hover)' : 'transparent',
                color: 'var(--text-primary)',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={(e) => { if (i !== idx) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={{ 
                display: 'inline-block', 
                height: '14px', 
                width: '14px', 
                borderRadius: '3px', 
                backgroundColor: 'var(--border-default)' 
              }} />
              <span style={{ flex: 1 }}>{it.label}</span>
              {it.zip && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{it.zip}</span>}
            </button>
          ))}
          {loading && <div style={{ padding: 'var(--space-2) var(--space-3)', fontSize: '13px', color: 'var(--text-secondary)' }}>Searching…</div>}
        </div>
      )}
      
      <CityNotFoundModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setModalCity(null);
          setModalState(null);
        }}
        city={modalCity}
        state={modalState}
        onCityAdded={handleCityAdded}
      />
    </div>
  );
}
