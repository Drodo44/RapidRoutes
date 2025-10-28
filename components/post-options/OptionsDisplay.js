// components/post-options/OptionsDisplay.js
// Displays generated pickup/delivery options with selection checkboxes
import React, { useState, useMemo } from 'react';
import { generateDatCsvFromSelections, generateRecapFromSelections } from '../../lib/optionsExport';

/**
 * Display component for lane options with selection capabilities
 * Shows origin and destination cities with KMAs, distances, and checkboxes
 */
export default function OptionsDisplay({ laneId, lane, originOptions = [], destOptions = [], onSelectionChange }) {
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

  const handleSelectAllOrigins = () => {
    const allOriginIds = originOptions.map(city => `${city.id}-${city.city}-${city.state}`);
    setSelectedOrigins(new Set(allOriginIds));
    if (onSelectionChange) {
      onSelectionChange({
        laneId,
        origins: allOriginIds,
        destinations: Array.from(selectedDestinations)
      });
    }
  };

  const handleClearAllOrigins = () => {
    setSelectedOrigins(new Set());
    if (onSelectionChange) {
      onSelectionChange({
        laneId,
        origins: [],
        destinations: Array.from(selectedDestinations)
      });
    }
  };

  const handleSelectAllDestinations = () => {
    const allDestIds = destOptions.map(city => `${city.id}-${city.city}-${city.state}`);
    setSelectedDestinations(new Set(allDestIds));
    if (onSelectionChange) {
      onSelectionChange({
        laneId,
        origins: Array.from(selectedOrigins),
        destinations: allDestIds
      });
    }
  };

  const handleClearAllDestinations = () => {
    setSelectedDestinations(new Set());
    if (onSelectionChange) {
      onSelectionChange({
        laneId,
        origins: Array.from(selectedOrigins),
        destinations: []
      });
    }
  };

  const handleSmartSelect = () => {
    // Select the best (closest) city from each KMA for both origins and destinations
    const bestOriginIds = [];
    const bestDestIds = [];
    
    // Get best origin from each KMA
    Object.entries(originsByKMA).forEach(([kmaCode, cities]) => {
      const bestCity = findBestCity(cities);
      if (bestCity) {
        bestOriginIds.push(`${bestCity.id}-${bestCity.city}-${bestCity.state}`);
      }
    });
    
    // Get best destination from each KMA
    Object.entries(destsByKMA).forEach(([kmaCode, cities]) => {
      const bestCity = findBestCity(cities);
      if (bestCity) {
        bestDestIds.push(`${bestCity.id}-${bestCity.city}-${bestCity.state}`);
      }
    });
    
    setSelectedOrigins(new Set(bestOriginIds));
    setSelectedDestinations(new Set(bestDestIds));
    
    if (onSelectionChange) {
      onSelectionChange({
        laneId,
        origins: bestOriginIds,
        destinations: bestDestIds
      });
    }
  };

  if (!originOptions.length && !destOptions.length) {
    return (
      <div className="text-center text-gray-400 py-8">
        No options generated yet. Click "Generate Options" to see available cities.
      </div>
    );
  }

  const totalCombinations = selectedOrigins.size * selectedDestinations.size;
  const hasSelections = selectedOrigins.size > 0 && selectedDestinations.size > 0;

  const handleGenerateCsv = () => {
    if (!hasSelections || !lane) return;
    
    try {
      const result = generateDatCsvFromSelections(
        lane,
        Array.from(selectedOrigins),
        Array.from(selectedDestinations),
        originOptions,
        destOptions
      );
      
      // Create and download CSV file
      const blob = new Blob([result.csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DAT_${lane.origin_city}_to_${lane.destination_city || lane.dest_city}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
      alert(`✅ CSV generated!\n\n${result.combinations} lane combinations\n${result.totalRows} total rows (${result.rowsPerCombination} per combination)`);
    } catch (error) {
      console.error('Error generating CSV:', error);
      alert(`❌ Error generating CSV: ${error.message}`);
    }
  };

  const handleGenerateRecap = () => {
    if (!hasSelections || !lane) return;
    
    try {
      const html = generateRecapFromSelections(
        lane,
        Array.from(selectedOrigins),
        Array.from(selectedDestinations),
        originOptions,
        destOptions
      );
      
      // Create and download HTML file
      const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Recap_${lane.origin_city}_to_${lane.destination_city || lane.dest_city}_${new Date().toISOString().split('T')[0]}.html`;
      link.click();
      URL.revokeObjectURL(url);
      
      alert(`✅ Recap generated!\n\nOpen the downloaded HTML file to view your posting recap.`);
    } catch (error) {
      console.error('Error generating recap:', error);
      alert(`❌ Error generating recap: ${error.message}`);
    }
  };

  return (
    <div>
      {/* Smart Select Banner */}
      <div className="mb-4 p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-600/50 rounded-lg">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-grow">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">⚡</span>
              <h4 className="font-semibold text-purple-300">Smart Pairing</h4>
            </div>
            <p className="text-sm text-gray-300">
              Auto-select the <strong>best city from each KMA</strong> (closest to lane endpoints) for maximum market coverage
            </p>
          </div>
          <button
            onClick={handleSmartSelect}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium transition-colors whitespace-nowrap"
          >
            ⚡ Smart Select Best Cities
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        {/* Origin Cities Panel */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-100">
              Pickup Cities ({originOptions.length})
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAllOrigins}
                className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                Select All
              </button>
              <button
                onClick={handleClearAllOrigins}
                className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded"
              >
                Clear
              </button>
              <div className="text-sm text-gray-400 ml-2">
                {selectedOrigins.size} selected
              </div>
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
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAllDestinations}
                className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                Select All
              </button>
              <button
                onClick={handleClearAllDestinations}
                className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded"
              >
                Clear
              </button>
              <div className="text-sm text-gray-400 ml-2">
                {selectedDestinations.size} selected
              </div>
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

      {/* Action Buttons */}
      <div className="mt-6 p-4 bg-gray-800 border border-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-sm text-gray-300">
            {hasSelections ? (
              <>
                <span className="font-semibold text-green-400">{totalCombinations} lane combinations</span> will be created
                <span className="text-gray-500 ml-2">
                  ({selectedOrigins.size} pickup × {selectedDestinations.size} delivery)
                </span>
                <div className="text-xs text-gray-400 mt-1">
                  {Object.keys(originsByKMA).length} pickup KMAs · {Object.keys(destsByKMA).length} delivery KMAs available
                </div>
              </>
            ) : (
              <span className="text-gray-400">Select at least one pickup and one delivery city</span>
            )}
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            disabled={!hasSelections}
            onClick={handleGenerateCsv}
            className={`flex-1 px-4 py-2 rounded font-medium transition-colors ${
              hasSelections
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            📄 Generate DAT CSV
          </button>
          
          <button
            disabled={!hasSelections}
            onClick={handleGenerateRecap}
            className={`flex-1 px-4 py-2 rounded font-medium transition-colors ${
              hasSelections
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            📋 Generate Recap
          </button>
        </div>
      </div>
    </div>
  );
}
