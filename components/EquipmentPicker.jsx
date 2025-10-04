// components/EquipmentPicker.jsx
import { useEffect, useMemo, useState, useRef } from 'react';
import supabase from '../utils/supabaseClient';

export default function EquipmentPicker({ id='equipment', label='Equipment Type', code, onChange, required=true }) {
  const [list, setList] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Initial load and when code prop changes
  useEffect(() => {
    if (code) {
      const selectedCode = String(code).toUpperCase();
      // Find the matching equipment from the list
      const found = list.find(item => item.code === selectedCode);
      if (found) {
        setSelectedItem(found);
        setInputValue(`${found.label} (${found.code})`);
      } else {
        setInputValue(selectedCode); // Just show the code if not found in list
      }
    } else {
      setSelectedItem(null);
      setInputValue('');
    }
  }, [code, list]);

  // Load equipment data
  useEffect(() => {
    let mounted = true;

    async function ensureSeedAndLoad() {
      try {
        // Self-seed (idempotent, server-side)
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
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filtered = useMemo(() => {
    const s = inputValue.trim().toLowerCase();
    if (!s) return list;
    
    // Prioritize exact code matches first, then partial matches
    const exactCodeMatches = list.filter(r => 
      String(r.code).toLowerCase() === s
    );
    
    const codeStartsWithMatches = list.filter(r => 
      String(r.code).toLowerCase().startsWith(s) && 
      !exactCodeMatches.includes(r)
    );
    
    const labelMatches = list.filter(r => 
      r.label.toLowerCase().includes(s) && 
      !exactCodeMatches.includes(r) && 
      !codeStartsWithMatches.includes(r)
    );
    
    const otherCodeMatches = list.filter(r => 
      String(r.code).toLowerCase().includes(s) && 
      !exactCodeMatches.includes(r) && 
      !codeStartsWithMatches.includes(r) && 
      !labelMatches.includes(r)
    );
    
    return [...exactCodeMatches, ...codeStartsWithMatches, ...labelMatches, ...otherCodeMatches].slice(0, 12);
  }, [list, inputValue]);

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setInputValue(`${item.label} (${item.code})`);
    setShowDropdown(false);
    onChange?.(item.code);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    setShowDropdown(true);
    
    // If they clear the input, clear the selection
    if (!value.trim()) {
      setSelectedItem(null);
      onChange?.('');
      return;
    }
    
    // Prioritize exact code matches for auto-selection
    const trimmedValue = value.trim().toUpperCase();
    const exactCodeMatch = list.find(item => 
      item.code === trimmedValue
    );
    
    if (exactCodeMatch) {
      setSelectedItem(exactCodeMatch);
      onChange?.(exactCodeMatch.code);
      return;
    }
    
    // If typing just the code (like "FD"), don't auto-select partial matches
    // Let them finish typing or click from dropdown
    if (/^[A-Z]{1,4}$/.test(trimmedValue)) {
      // Reset selection until they complete or click
      setSelectedItem(null);
      onChange?.(trimmedValue); // Pass through the raw code
    }
  };

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <label htmlFor={id} className="form-label">{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          id={id}
          type="text"
          placeholder="Type to search equipment..."
          className="form-input"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setShowDropdown(true)}
          required={required}
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
            paddingRight: 'var(--space-3)',
            cursor: 'pointer'
          }}
          onClick={() => {
            setShowDropdown(!showDropdown);
            if (!showDropdown) inputRef.current?.focus();
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" style={{ height: '16px', width: '16px', color: 'var(--text-tertiary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {showDropdown && filtered.length > 0 && (
        <div 
          ref={dropdownRef}
          style={{
            position: 'absolute',
            zIndex: 10,
            width: '100%',
            marginTop: 'var(--space-1)',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            maxHeight: '240px',
            overflowY: 'auto'
          }}
        >
          <ul style={{ padding: 'var(--space-1) 0', listStyle: 'none', margin: 0 }}>
            {filtered.map(item => (
              <li 
                key={item.code}
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  backgroundColor: selectedItem?.code === item.code ? 'var(--primary-light)' : 'transparent',
                  color: selectedItem?.code === item.code ? 'var(--primary-text)' : 'var(--text-primary)',
                  transition: 'background 0.15s'
                }}
                onClick={() => handleItemClick(item)}
                onMouseEnter={(e) => { 
                  if (selectedItem?.code !== item.code) {
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; 
                  }
                }}
                onMouseLeave={(e) => { 
                  if (selectedItem?.code !== item.code) {
                    e.currentTarget.style.backgroundColor = 'transparent'; 
                  }
                }}
              >
                <span>{item.label}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{item.code}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {selectedItem && (
        <div style={{ fontSize: '11px', color: 'var(--primary)', marginTop: 'var(--space-1)' }}>
          Selected: <span style={{ fontWeight: 500 }}>{selectedItem.label}</span> <span style={{ fontFamily: 'monospace' }}>({selectedItem.code})</span>
        </div>
      )}
    </div>
  );
}
