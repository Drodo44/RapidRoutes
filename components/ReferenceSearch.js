// components/ReferenceSearch.js
// Enhanced search component for finding lanes by reference ID

import { useState } from 'react';

export default function ReferenceSearch({ onLaneFound, onClear }) {
  const [referenceId, setReferenceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [foundLane, setFoundLane] = useState(null);

  const searchByReference = async () => {
    if (!referenceId.trim()) {
      setError('Please enter a reference ID');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/searchByReference?referenceId=${encodeURIComponent(referenceId.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setFoundLane(data.lane);
      if (onLaneFound) {
        onLaneFound(data);
      }
    } catch (err) {
      setError(err.message);
      setFoundLane(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setReferenceId('');
    setError('');
    setFoundLane(null);
    if (onClear) {
      onClear();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchByReference();
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6">
      <h3 className="text-lg font-semibold text-gray-100 mb-3">Quick Reference Search</h3>
      
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Reference ID
          </label>
          <input
            type="text"
            value={referenceId}
            onChange={(e) => setReferenceId(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            placeholder="Enter 5-digit reference ID (e.g., 12345)"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
            maxLength={8}
          />
        </div>
        
        <button
          onClick={searchByReference}
          disabled={loading || !referenceId.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
        
        {(foundLane || error) && (
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-900/50 border border-red-700 rounded-lg">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {foundLane && (
        <div className="mt-4 p-4 bg-green-900/30 border border-green-700 rounded-lg">
          <h4 className="text-green-300 font-medium mb-2">Lane Found!</h4>
          <div className="text-sm text-gray-200">
            <div className="font-medium">
              {foundLane.origin_city}, {foundLane.origin_state} → {foundLane.dest_city}, {foundLane.dest_state}
            </div>
            <div className="text-gray-400 mt-1">
              {foundLane.equipment_code} • {foundLane.length_ft}ft • 
              {foundLane.randomize_weight 
                ? ` ${foundLane.weight_min}-${foundLane.weight_max} lbs` 
                : ` ${foundLane.weight_lbs} lbs`}
            </div>
            <div className="text-gray-400">
              Pickup: {foundLane.pickup_earliest} → {foundLane.pickup_latest}
            </div>
            {foundLane.comment && (
              <div className="text-gray-400 italic mt-1">"{foundLane.comment}"</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
