// components/EquipmentPicker.jsx - Premium Design System
import { useEffect, useMemo, useState, useRef } from 'react';
import supabase from '../utils/supabaseClient';

export default function EquipmentPicker({ id = 'equipment', label = 'Equipment Type', code, onChange, required = true }) {
  const [list, setList] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Initial load when code prop changes
  useEffect(() => {
    if (code && list.length > 0) {
      const selectedCode = String(code).toUpperCase();
      const found = list.find(item => item.code === selectedCode);
      if (found) {
        setSelectedItem(found);
        setInputValue(`${found.label} (${found.code})`);
      } else {
        setInputValue(selectedCode);
      }
    } else if (!code) {
      setSelectedItem(null);
      setInputValue('');
    }
  }, [code, list]);

  // Load equipment data
  useEffect(() => {
    let mounted = true;

    async function ensureSeedAndLoad() {
      try {
        await fetch('/api/bootstrapEquipment', { method: 'POST' });
      } catch { /* non-fatal */ }

      const { data, error } = await supabase
        .from('equipment_codes')
        .select('code,label')
        .order('label', { ascending: true });
      if (!mounted) return;
      if (error) { console.error(error); setList([]); }
      else setList(data || []);
    }

    ensureSeedAndLoad();
    return () => { mounted = false; };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        inputRef.current && !inputRef.current.contains(event.target)) {
        setShowDropdown(false);
        setHighlightIdx(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter equipment list - supports abbreviations
  const filtered = useMemo(() => {
    const s = inputValue.trim().toLowerCase();
    if (!s) return list.slice(0, 12);

    // Prioritize exact code matches first
    const exactCodeMatches = list.filter(r =>
      String(r.code).toLowerCase() === s
    );

    // Then code starts with (for partial abbreviations like "F" matching "FD", "FB")
    const codeStartsWithMatches = list.filter(r =>
      String(r.code).toLowerCase().startsWith(s) &&
      !exactCodeMatches.includes(r)
    );

    // Then label contains
    const labelMatches = list.filter(r =>
      r.label.toLowerCase().includes(s) &&
      !exactCodeMatches.includes(r) &&
      !codeStartsWithMatches.includes(r)
    );

    // Then other code matches
    const otherCodeMatches = list.filter(r =>
      String(r.code).toLowerCase().includes(s) &&
      !exactCodeMatches.includes(r) &&
      !codeStartsWithMatches.includes(r) &&
      !labelMatches.includes(r)
    );

    return [...exactCodeMatches, ...codeStartsWithMatches, ...labelMatches, ...otherCodeMatches].slice(0, 12);
  }, [list, inputValue]);

  // Keyboard navigation handler
  const handleKeyDown = (e) => {
    if (!showDropdown) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setShowDropdown(true);
        setHighlightIdx(0);
        return;
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(i => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(i => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIdx >= 0 && filtered[highlightIdx]) {
        handleItemClick(filtered[highlightIdx]);
      } else if (filtered.length > 0) {
        handleItemClick(filtered[0]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setHighlightIdx(-1);
    } else if (e.key === 'Tab') {
      // Tab should select current item if one is highlighted
      if (highlightIdx >= 0 && filtered[highlightIdx]) {
        handleItemClick(filtered[highlightIdx]);
      }
    }
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setInputValue(`${item.label} (${item.code})`);
    setShowDropdown(false);
    setHighlightIdx(-1);
    onChange?.(item.code);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    setShowDropdown(true);
    setHighlightIdx(-1);

    // If they clear the input, clear the selection
    if (!value.trim()) {
      setSelectedItem(null);
      onChange?.('');
      return;
    }

    // DON'T auto-select on exact match anymore - let user explicitly pick
    // This fixes the "premature auto-fill" issue
    // Just pass the uppercase code through for validation purposes
    const trimmedValue = value.trim().toUpperCase();
    if (/^[A-Z0-9]{1,6}$/.test(trimmedValue)) {
      // Only update the code value, not the selectedItem
      // This allows form validation to work with the raw code
      onChange?.(trimmedValue);
    }
  };

  // Dropdown styling matching new design system
  const dropdownStyle = {
    position: 'absolute',
    zIndex: 50,
    width: '100%',
    marginTop: '4px',
    background: 'linear-gradient(135deg, rgba(10, 10, 10, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)',
    backdropFilter: 'blur(20px)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
    maxHeight: '280px',
    overflowY: 'auto'
  };

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {label && <label htmlFor={id} className="form-label">{label}</label>}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          id={id}
          type="text"
          placeholder="Type code (V, R, F) or search..."
          className="form-input"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          required={required}
          autoComplete="off"
        />
        {/* Dropdown arrow */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            paddingRight: '12px',
            cursor: 'pointer',
            color: 'var(--text-tertiary)'
          }}
          onClick={() => {
            setShowDropdown(!showDropdown);
            if (!showDropdown) inputRef.current?.focus();
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" style={{ height: '16px', width: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showDropdown ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
          </svg>
        </div>
      </div>

      {showDropdown && filtered.length > 0 && (
        <div ref={dropdownRef} style={dropdownStyle}>
          {filtered.map((item, i) => (
            <div
              key={item.code}
              style={{
                padding: '12px 16px',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: i === highlightIdx ? 'rgba(59, 130, 246, 0.15)' :
                  selectedItem?.code === item.code ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                borderLeft: i === highlightIdx ? '2px solid var(--primary)' : '2px solid transparent',
                color: 'var(--text-primary)',
                transition: 'all 0.15s ease'
              }}
              onClick={() => handleItemClick(item)}
              onMouseEnter={() => setHighlightIdx(i)}
            >
              <span style={{ fontWeight: '500' }}>{item.label || 'Unknown'}</span>
              <span style={{
                fontSize: '12px',
                fontFamily: 'monospace',
                padding: '2px 8px',
                backgroundColor: selectedItem?.code === item.code ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                color: selectedItem?.code === item.code ? 'var(--primary)' : 'var(--text-tertiary)',
                borderRadius: '4px',
                fontWeight: '600'
              }}>
                {item.code || '?'}
              </span>
            </div>
          ))}
        </div>
      )}

      {showDropdown && filtered.length === 0 && inputValue.trim() && (
        <div ref={dropdownRef} style={dropdownStyle}>
          <div style={{
            padding: '16px',
            fontSize: '14px',
            color: 'var(--text-secondary)',
            textAlign: 'center'
          }}>
            No equipment found for "{inputValue}"
            <div style={{
              marginTop: '8px',
              fontSize: '12px',
              color: 'var(--text-tertiary)'
            }}>
              Try V (Van), R (Reefer), F (Flatbed)
            </div>
          </div>
        </div>
      )}

      {selectedItem && !showDropdown && (
        <div style={{
          fontSize: '12px',
          color: 'var(--success)',
          marginTop: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'var(--success)',
            animation: 'pulse-dot 2s ease-in-out infinite'
          }}></span>
          <span style={{ fontWeight: '500' }}>{selectedItem.label}</span>
          <span style={{ fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>({selectedItem.code})</span>
        </div>
      )}
    </div>
  );
}
