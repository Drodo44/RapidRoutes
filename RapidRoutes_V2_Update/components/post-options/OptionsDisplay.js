// components/post-options/OptionsDisplay.js
// Displays generated pickup/delivery options with selection checkboxes
import React, { useState, useMemo } from 'react';
import { generateDatCsvFromSelections, generateRecapFromSelections } from '../../lib/optionsExport';

import ManualCityAdd from './ManualCityAdd';

/**
 * Display component for lane options with selection capabilities
 * Shows origin and destination cities with KMAs, distances, and checkboxes
 */
export default function OptionsDisplay({ laneId, lane, originOptions = [], destOptions = [], onSelectionChange, onManualAdd }) {
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

  // Helper for robust name matching (handles "St." vs "Saint", "Ft" vs "Fort", etc.)
  const normalizeCityName = (name) => {
    return (name || '').toLowerCase()
      .replace(/\s+(mkt|market)\s*$/i, '') // Remove market suffix first
      .replace(/^n[\.\s]+/, 'north ') // Directionals start of string
      .replace(/^s[\.\s]+/, 'south ')
      .replace(/^e[\.\s]+/, 'east ')
      .replace(/^w[\.\s]+/, 'west ')
      .replace(/\b(ft\.?|fort)\b/g, 'fort')
      .replace(/\b(st\.?|saint)\b/g, 'saint')
      .replace(/\b(mt\.?|mount)\b/g, 'mount')
      .replace(/[^a-z0-9]/g, ''); // Remove all punctuation/spaces for fuzzy match
  };

  // Find best (typically Market City, otherwise closest) city in each group
  const findBestCity = (cities) => {
    if (!cities || cities.length === 0) return null;
    
    // 1. Try to find the Market City match first
    const marketCity = cities.find(c => {
      if (!c.kma_name) return false;
      const kmaName = normalizeCityName(c.kma_name);
      const cityName = normalizeCityName(c.city);
      return kmaName === cityName;
    });

    if (marketCity) return marketCity;

    // 2. Fallback to closest city
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
                
                <div className="flex-grow">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${isBest ? 'text-yellow-400 font-bold' : city.isManual ? 'text-green-400 font-semibold' : 'text-gray-100'}`}>
                      {isBest && '⭐ '} {city.isManual && '➕ '}
                      {city.city}, {city.state}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${isBest ? 'bg-yellow-900/30 text-yellow-200' : city.isManual ? 'bg-green-900/30 text-green-200' : 'bg-gray-700 text-gray-300'}`}>
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
    
    // Sort cities: Manual adds first, then Market City (matching KMA Name), then by mileage
    const sortedCities = [...cities].sort((a, b) => {
      // Priority 1: Manually added cities
      if (a.isManual && !b.isManual) return -1;
      if (!a.isManual && b.isManual) return 1;

      // Priority 2: Market City Name match
      // Robust matcher: Handle " Mkt", " Market", trailing spaces, case-insensitivity
      const kmaNameA = normalizeCityName(a.kma_name);
      const cityNameA = normalizeCityName(a.city);
      const aIsMarket = kmaNameA === cityNameA;

      const kmaNameB = normalizeCityName(b.kma_name);
      const cityNameB = normalizeCityName(b.city);
      const bIsMarket = kmaNameB === cityNameB;
      
      if (aIsMarket && !bIsMarket) return -1;
      if (!aIsMarket && bIsMarket) return 1;
      
      // Priority 3: Distance
      return (a.distance || 0) - (b.distance || 0);
    });

    // Get readable KMA display name (e.g., "Chicago KMA" instead of "IL_CHI")
    const rawKmaName = cities.find(c => c.kma_name)?.kma_name;
    const kmaDisplayName = rawKmaName 
      ? rawKmaName.replace(/\s+(Mkt|Market)\s*$/i, ' KMA') 
      : `KMA: ${kmaCode}`;

    return (
      <div key={kmaCode} className="mb-4">
        <div className="text-sm font-semibold text-gray-300 mb-2 px-2">
          {kmaDisplayName} ({cities.length} {cities.length === 1 ? 'city' : 'cities'})
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

  const handleSaveSelections = async () => {
    if (!hasSelections || !lane) return;
    
    try {
      // Get selected city objects with all their data
      const selectedOriginCities = Array.from(selectedOrigins).map(id => {
        const city = originOptions.find(city => `${city.id}-${city.city}-${city.state}` === id);
        return city ? {
          id: city.id,
          city: city.city,
          state: city.state || city.state_or_province,
          zip: city.zip,
          kma_code: city.kma_code,
          latitude: city.latitude,
          longitude: city.longitude,
          distance: city.distance
        } : null;
      }).filter(Boolean);
      
      const selectedDestCities = Array.from(selectedDestinations).map(id => {
        const city = destOptions.find(city => `${city.id}-${city.city}-${city.state}` === id);
        return city ? {
          id: city.id,
          city: city.city,
          state: city.state || city.state_or_province,
          zip: city.zip,
          kma_code: city.kma_code,
          latitude: city.latitude,
          longitude: city.longitude,
          distance: city.distance
        } : null;
      }).filter(Boolean);

      // Save to database
      const response = await fetch('/api/save-city-selections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          laneId,
          originCities: selectedOriginCities,
          destCities: selectedDestCities
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save selections');
      }

      const result = await response.json();
      
      alert(`✅ Selections saved!\n\n${result.totalCombinations} lane combinations saved.\n\nView them in the Recap page.`);
    } catch (error) {
      console.error('Error saving selections:', error);
      alert(`❌ Error saving selections: ${error.message}`);
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
          
          <ManualCityAdd 
             type="origin" 
             onAdd={(city) => {
               if (onManualAdd) onManualAdd('origin', city);
               
               // Auto-select the newly added city
               const state = city.state || city.state_or_province;
               const cityId = `${city.id}-${city.city}-${state}`;
               
               setSelectedOrigins(prev => {
                 const newSelected = new Set(prev);
                 newSelected.add(cityId);
                 
                 // Propagate selection change
                 if (onSelectionChange) {
                   onSelectionChange({
                     laneId,
                     origins: Array.from(newSelected),
                     destinations: Array.from(selectedDestinations)
                   });
                 }
                 
                 return newSelected;
               });
             }} 
          />
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

          <ManualCityAdd 
             type="dest" 
             onAdd={(city) => {
               if (onManualAdd) onManualAdd('dest', city);
               
               // Auto-select the newly added city
               const state = city.state || city.state_or_province;
               const cityId = `${city.id}-${city.city}-${state}`;
               
               setSelectedDestinations(prev => {
                 const newSelected = new Set(prev);
                 newSelected.add(cityId);
                 
                 // Propagate selection change
                 if (onSelectionChange) {
                   onSelectionChange({
                     laneId,
                     origins: Array.from(selectedOrigins),
                     destinations: Array.from(newSelected)
                   });
                 }
                 
                 return newSelected;
               });
             }} 
          />
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
        
        <div className="flex gap-3 flex-wrap">
          <button
            disabled={!hasSelections}
            onClick={handleSaveSelections}
            className={`flex-1 min-w-[200px] px-4 py-2 rounded font-medium transition-colors ${
              hasSelections
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            💾 Save Selections & Add to Recap
          </button>
          
          <button
            disabled={!hasSelections}
            onClick={handleGenerateCsv}
            className={`flex-1 min-w-[180px] px-4 py-2 rounded font-medium transition-colors ${
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
            className={`flex-1 min-w-[180px] px-4 py-2 rounded font-medium transition-colors ${
              hasSelections
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            📋 Export HTML Recap
          </button>
        </div>
      </div>
    </div>
  );
}
