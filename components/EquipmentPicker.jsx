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
    <div className="w-full relative">
      <label htmlFor={id} className="block text-sm text-gray-300 mb-1">{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          placeholder="Type to search equipment..."
          className="w-full rounded-lg bg-gray-800 border border-gray-600 px-3 py-2 text-gray-100 outline-none focus:border-gray-500"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setShowDropdown(true)}
          required={required}
        />
        {/* Dropdown arrow */}
        <div 
          className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
          onClick={() => {
            setShowDropdown(!showDropdown);
            if (!showDropdown) inputRef.current?.focus();
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {showDropdown && filtered.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          <ul className="py-1">
            {filtered.map(item => (
              <li 
                key={item.code}
                className={`px-3 py-2 text-sm cursor-pointer flex justify-between ${
                  selectedItem?.code === item.code 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-200 hover:bg-gray-700'
                }`}
                onClick={() => handleItemClick(item)}
              >
                <span>{item.label}</span>
                <span className="text-xs text-gray-400">{item.code}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {selectedItem && (
        <div className="text-xs text-blue-400 mt-1">
          Selected: <span className="font-medium">{selectedItem.label}</span> <span className="font-mono">({selectedItem.code})</span>
        </div>
      )}
    </div>
  );
}
