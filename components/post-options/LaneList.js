// components/post-options/LaneList.js
import React from 'react';

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
      
      {lanes.map((lane) => (
        <div 
          key={lane.id} 
          className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded gap-4"
        >
          <div className="flex-grow">
            <div className="font-medium">
              {lane.origin_city}, {lane.origin_state} → {lane.destinationCity}, {lane.destinationState}
            </div>
            <div className="text-sm text-gray-400 mt-1 flex flex-wrap gap-2">
              <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs">
                {lane.equipment_code}
              </span>
              {lane.weight_lbs && (
                <span className="text-xs">
                  {lane.formattedWeight} lbs
                </span>
              )}
              {lane.length_ft && (
                <span className="text-xs">
                  {lane.length_ft} ft
                </span>
              )}
              <span className="text-xs text-gray-500">
                ID: {lane.shortId}...
              </span>
            </div>
          </div>
          <div>
            <button
              onClick={() => onGenerateOptions(lane)}
              className="w-full md:w-auto px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded"
            >
              Generate Options
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}