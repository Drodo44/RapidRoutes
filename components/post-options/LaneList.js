// components/post-options/LaneList.js
import React, { useState } from 'react';
import OptionsDisplay from './OptionsDisplay';

/**
 * A component to display a list of lanes with generate options buttons
 * 
 * @param {Object} props
 * @param {Array} props.lanes - Array of lane objects
 * @param {Function} props.onGenerateOptions - Callback when Generate Options is clicked
 * @param {boolean} props.loading - Whether lanes are currently being loaded
 * @param {string} props.error - Error message, if any
 */
export default function LaneList({ lanes = [], onGenerateOptions, loading = false, error = null }) {
  const [generatedOptions, setGeneratedOptions] = useState({});
  const [expandedLanes, setExpandedLanes] = useState(new Set());

  const handleGenerateOptions = async (lane) => {
    await onGenerateOptions(lane);
    // Note: Options will be stored in state after generation
  };

  const toggleLaneExpansion = (laneId) => {
    const newExpanded = new Set(expandedLanes);
    if (newExpanded.has(laneId)) {
      newExpanded.delete(laneId);
    } else {
      newExpanded.add(laneId);
    }
    setExpandedLanes(newExpanded);
  };

  const handleSelectionChange = (laneId, selections) => {
    // Store selections for later use (CSV generation or Recap)
    console.log('Selection changed for lane:', laneId, selections);
    // TODO: Store selections in parent component state
  };
  
  if (loading) {
    return (
      <div className="my-6 p-4 bg-gray-800 text-gray-200 rounded">
        <p className="text-center">Loading lanes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-6 p-4 bg-red-900 text-red-100 border border-red-700 rounded">
        <p className="font-medium">Error loading lanes</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (!lanes || lanes.length === 0) {
    return (
      <div className="my-6 p-6 bg-gray-800 text-gray-300 border border-gray-700 rounded text-center">
        <p>No active lanes found.</p>
        <p className="text-sm text-gray-400 mt-2">Create lanes to see them here.</p>
      </div>
    );
  }

  return (
    <div className="my-6 space-y-3">
      <div className="text-gray-400 text-sm mb-2">
        Showing {lanes.length} lane{lanes.length !== 1 ? 's' : ''}
      </div>
      
      {lanes.map((lane, index) => {
        const laneId = lane?.id || index;
        const isExpanded = expandedLanes.has(laneId);
        const options = generatedOptions[laneId];
        
        return (
          <div 
            key={laneId}
            className="bg-gray-800 border border-gray-700 rounded"
          >
            {/* Lane Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
              <div className="flex-grow">
                <div className="font-medium">
                  {(lane?.origin_city || lane?.originCity || '—')}, {(lane?.origin_state || lane?.originState || '—')} 
                  → {(lane?.dest_city || lane?.destination_city || lane?.destinationCity || '—')}, {(lane?.dest_state || lane?.destination_state || lane?.destinationState || '—')}
                </div>
                <div className="text-sm text-gray-400 mt-1 flex flex-wrap gap-2">
                  <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs">
                    {lane?.equipment_code || lane?.equipment || 'UNK'}
                  </span>
                  {lane?.weight_lbs && (
                    <span className="text-xs">
                      {(lane?.formattedWeight || lane?.weight_lbs)?.toLocaleString?.() || lane?.formattedWeight || lane?.weight_lbs} lbs
                    </span>
                  )}
                  {lane?.length_ft && (
                    <span className="text-xs">
                      {lane?.length_ft} ft
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    ID: {(lane?.shortId || String(lane?.id || '').slice(0, 6) || 'sample')}...
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const result = await onGenerateOptions?.(lane);
                    if (result && result.data) {
                      setGeneratedOptions(prev => ({
                        ...prev,
                        [laneId]: {
                          originOptions: result.data.originOptions || [],
                          destOptions: result.data.destOptions || []
                        }
                      }));
                      setExpandedLanes(prev => new Set([...prev, laneId]));
                    }
                  }}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                >
                  Generate Options
                </button>
                {options && (
                  <button
                    onClick={() => toggleLaneExpansion(laneId)}
                    className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
                  >
                    {isExpanded ? 'Hide' : 'Show'} Options
                  </button>
                )}
              </div>
            </div>
            
            {/* Options Display */}
            {isExpanded && options && (
              <div className="border-t border-gray-700 p-4">
                <OptionsDisplay
                  laneId={laneId}
                  originOptions={options.originOptions || []}
                  destOptions={options.destOptions || []}
                  onSelectionChange={(selections) => handleSelectionChange(laneId, selections)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}