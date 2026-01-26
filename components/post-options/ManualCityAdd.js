import React, { useState, useEffect, useRef } from 'react';

// Use a debounce helper
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

export default function ManualCityAdd({ type, onAdd }) {
  const [term, setTerm] = useState('');
  const debouncedTerm = useDebounce(term, 300);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  // Search effect
  useEffect(() => {
    if (!debouncedTerm || debouncedTerm.length < 2) {
      setResults([]);
      return;
    }

    const fetchCities = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cities?q=${encodeURIComponent(debouncedTerm)}`);
        if (res.ok) {
          const data = await res.json();
          // Filter to show sufficient detail
          setResults(data);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCities();
  }, [debouncedTerm]);

  const handleSelect = (city) => {
    onAdd(city);
    setTerm('');
    setResults([]);
    setShowDropdown(false);
  };

  return (
    <div className="mt-4 p-3 bg-gray-800 border-t border-gray-700 relative" ref={wrapperRef}>
      <h4 className="text-sm font-semibold text-gray-300 mb-2">
        ➕ Manually Add {type === 'origin' ? 'Pickup' : 'Delivery'} City
      </h4>
      <div className="relative">
        <input
          type="text"
          className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          placeholder="e.g. Kokomo, IN"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
        />
        {loading && (
          <div className="absolute right-3 top-2.5">
             <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {showDropdown && results.length > 0 && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded shadow-xl max-h-60 overflow-y-auto">
            {results.map((city) => (
              <div
                key={city.id}
                className="px-4 py-2 hover:bg-gray-700 cursor-pointer text-sm text-gray-200 border-b border-gray-700 last:border-0"
                onClick={() => handleSelect(city)}
              >
                <div className="font-medium">{city.city}, {city.state_or_province}</div>
                <div className="text-xs text-gray-400">
                  {city.kma_name} ({city.kma_code}) {city.zip ? `• ${city.zip}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {showDropdown && debouncedTerm.length >= 2 && results.length === 0 && !loading && (
           <div className="absolute z-50 left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded shadow-xl p-3 text-sm text-gray-400 text-center">
             No cities found
           </div>
        )}
      </div>
    </div>
  );
}
