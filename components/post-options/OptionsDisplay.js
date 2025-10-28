// components/post-options/OptionsDisplay.js
// Displays generated pickup/delivery options with selection checkboxes
import React, { useState, useMemo } from 'react';

/**
 * Display component for lane options with selection capabilities
 * Shows origin and destination cities with KMAs, distances, and checkboxes
 */
export default function OptionsDisplay({ laneId, originOptions = [], destOptions = [], onSelectionChange }) {
  const [selectedOrigins, setSelectedOrigins] = useState(new Set());
  const [selectedDestinations, setSelectedDestinations] = useState(new Set());

  // Group options by KMA for better organization
  const groupByKMA = (options) => {
    const grouped = {};
    options.forEach(option => {
      const kma = option.kma_code || 'UNKNOWN';
      if (!grouped[kma]) {
        grouped[kma] = [];
      }
      grouped[kma].push(option);
    });
    return grouped;
  };

  const originsByKMA = useMemo(() => groupByKMA(originOptions), [originOptions]);
  const destsByKMA = useMemo(() => groupByKMA(destOptions), [destOptions]);

  // Find best (closest) city in each group
  const findBestCity = (cities) => {
    if (!cities || cities.length === 0) return null;
    return cities.reduce((best, city) => 
      !best || city.distance < best.distance ? city : best
    , null);
  };

  const handleOriginToggle = (cityId) => {
    const newSelected = new Set(selectedOrigins);
    if (newSelected.has(cityId)) {
      newSelected.delete(cityId);
    } else {
      newSelected.add(cityId);
    }
    setSelectedOrigins(newSelected);
    
    if (onSelectionChange) {
      onSelectionChange({
        laneId,
        origins: Array.from(newSelected),
        destinations: Array.from(selectedDestinations)
      });
    }
  };

  const handleDestToggle = (cityId) => {
    const newSelected = new Set(selectedDestinations);
    if (newSelected.has(cityId)) {
      newSelected.delete(cityId);
    } else {
      newSelected.add(cityId);
    }
    setSelectedDestinations(newSelected);
    
    if (onSelectionChange) {
      onSelectionChange({
        laneId,
        origins: Array.from(selectedOrigins),
        destinations: Array.from(newSelected)
      });
    }
  };

  const renderCityOption = (city, isBest, isOrigin, isSelected, onToggle) => {
    const cityId = `${city.id}-${city.city}-${city.state}`;
    
    return (
      <div 
        key={cityId}
        className={`flex items-center gap-2 p-2 rounded ${
          isSelected ? 'bg-blue-900/30 border border-blue-600' : 'bg-gray-800 border border-gray-700'
        } hover:bg-gray-750 transition-colors cursor-pointer`}
        onClick={() => onToggle(cityId)}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(cityId)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
        
        {isBest && (
          <span className="text-yellow-400 text-sm" title="Best option (closest)">
            ★
          </span>
        )}
        
        <div className="flex-grow">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-100">{city.city}, {city.state}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
              {city.kma_code || 'UNK'}
            </span>
          </div>
          <div className="text-xs text-gray-400">
            {Math.round(city.distance)} miles from lane {isOrigin ? 'origin' : 'destination'}
          </div>
        </div>
      </div>
    );
  };

  const renderKMAGroup = (kmaCode, cities, isOrigin) => {
    const bestCity = findBestCity(cities);
    const sortedCities = [...cities].sort((a, b) => a.distance - b.distance);
    
    return (
      <div key={kmaCode} className="mb-4">
        <div className="text-sm font-semibold text-gray-300 mb-2 px-2">
          KMA: {kmaCode} ({cities.length} {cities.length === 1 ? 'city' : 'cities'})
        </div>
        <div className="space-y-1">
          {sortedCities.map(city => {
            const cityId = `${city.id}-${city.city}-${city.state}`;
            const isBest = bestCity && city.id === bestCity.id;
            const isSelected = isOrigin 
              ? selectedOrigins.has(cityId)
              : selectedDestinations.has(cityId);
            const onToggle = isOrigin ? handleOriginToggle : handleDestToggle;
            
            return renderCityOption(city, isBest, isOrigin, isSelected, onToggle);
          })}
        </div>
      </div>
    );
  };

  if (!originOptions.length && !destOptions.length) {
    return (
      <div className="text-center text-gray-400 py-8">
        No options generated yet. Click "Generate Options" to see available cities.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
      {/* Origin Cities Panel */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-100">
            Pickup Cities ({originOptions.length})
          </h3>
          <div className="text-sm text-gray-400">
            {selectedOrigins.size} selected
          </div>
        </div>
        
        <div className="max-h-[600px] overflow-y-auto space-y-2">
          {Object.entries(originsByKMA)
            .sort(([kmaA], [kmaB]) => kmaA.localeCompare(kmaB))
            .map(([kmaCode, cities]) => renderKMAGroup(kmaCode, cities, true))
          }
        </div>
      </div>

      {/* Destination Cities Panel */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-100">
            Delivery Cities ({destOptions.length})
          </h3>
          <div className="text-sm text-gray-400">
            {selectedDestinations.size} selected
          </div>
        </div>
        
        <div className="max-h-[600px] overflow-y-auto space-y-2">
          {Object.entries(destsByKMA)
            .sort(([kmaA], [kmaB]) => kmaA.localeCompare(kmaB))
            .map(([kmaCode, cities]) => renderKMAGroup(kmaCode, cities, false))
          }
        </div>
      </div>
    </div>
  );
}
