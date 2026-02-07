// components/CityAutocomplete.jsx - Premium Design System with Tab-to-select
import { useEffect, useMemo, useRef, useState } from "react";
import CityNotFoundModal from './CityNotFoundModal';

export default function CityAutocomplete({ label, value, onChange, onPick, placeholder = "City, ST" }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [idx, setIdx] = useState(0); // Default to 0 so first item is highlighted
  const [showModal, setShowModal] = useState(false);
  const [modalCity, setModalCity] = useState(null);
  const [modalState, setModalState] = useState(null);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  const canQuery = (v) => (v?.trim()?.length || 0) >= 2;

  // Fetch suggestions when value changes
  useEffect(() => {
    let active = true;
    const v = value || "";
    if (!canQuery(v)) {
      setItems([]);
      setOpen(false);
      return;
    }

    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const r = await fetch(`/api/cities?q=${encodeURIComponent(v)}`);
        const j = await r.json();
        if (!active) return;

        const results = Array.isArray(j) ? j : [];
        setItems(results);

        // If no results found and input looks like "City, ST" format, show modal
        if (results.length === 0 && v.includes(',')) {
          const parts = v.split(',').map(p => p.trim());
          if (parts.length === 2 && parts[0] && parts[1].length === 2) {
            setModalCity(parts[0]);
            setModalState(parts[1].toUpperCase());
            setShowModal(true);
          }
        }

        setOpen(results.length > 0);
        setIdx(0); // Reset to first item
      } finally {
        if (active) setLoading(false);
      }
    }, 150);

    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [value]);

  // Click outside to close
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
    onPick?.(it);
    setOpen(false);
    setIdx(0);
  }

  function onKey(e) {
    // Handle Escape even when dropdown is closed
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }

    if (!open || !items.length) {
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (idx >= 0 && items[idx]) {
        pick(items[idx]);
      } else if (items.length > 0) {
        pick(items[0]);
      }
    } else if (e.key === "Tab") {
      // Tab selects first item or highlighted item - like DAT!
      if (items.length > 0) {
        e.preventDefault();
        if (idx >= 0 && items[idx]) {
          pick(items[idx]);
        } else {
          pick(items[0]);
        }
      }
    }
  }

  const handleCityAdded = (newCity) => {
    const newItem = {
      city: newCity.city,
      state: newCity.state_or_province,
      zip: newCity.zip,
      label: `${newCity.city}, ${newCity.state_or_province}`
    };

    onChange?.(newItem.label);
    onPick?.(newItem);

    setModalCity(null);
    setModalState(null);
  };

  const list = useMemo(() => items.slice(0, 12), [items]);

  // Dropdown styling matching new design system
  const dropdownStyle = {
    position: 'absolute',
    zIndex: 50,
    marginTop: '4px',
    maxHeight: '280px',
    width: '100%',
    overflowY: 'auto',
    borderRadius: '10px',
    border: '1px solid var(--border)',
    background: 'linear-gradient(135deg, rgba(10, 10, 10, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)'
  };

  const itemBaseStyle = {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '14px',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    transition: 'all 0.15s ease',
    background: 'transparent'
  };

  return (
    <div style={{ position: 'relative' }} ref={boxRef}>
      {label && <label className="form-label">{label}</label>}
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => canQuery(value) && setOpen(true)}
        onKeyDown={onKey}
        className="form-input"
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />

      {open && list.length > 0 && (
        <div style={dropdownStyle}>
          {list.map((it, i) => (
            <button
              key={`${it.city}-${it.state}-${i}`}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(it); }}
              onMouseEnter={() => setIdx(i)}
              style={{
                ...itemBaseStyle,
                backgroundColor: i === idx ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                borderLeft: i === idx ? '2px solid var(--primary)' : '2px solid transparent'
              }}
            >
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '20px',
                width: '20px',
                borderRadius: '4px',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                color: 'var(--primary)',
                fontSize: '10px',
                fontWeight: '600'
              }}>
                📍
              </span>
              <span style={{ flex: 1, fontWeight: '500' }}>{it.label}</span>
              {it.zip && (
                <span style={{
                  fontSize: '12px',
                  color: 'var(--text-tertiary)',
                  fontFamily: 'monospace',
                  padding: '2px 6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '4px'
                }}>
                  {it.zip}
                </span>
              )}
            </button>
          ))}
          {loading && (
            <div style={{
              padding: '12px 16px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div>
              Searching…
            </div>
          )}
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
