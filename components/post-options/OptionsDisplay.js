// components/post-options/OptionsDisplay.js
// Displays generated pickup/delivery options with selection checkboxes
import React, { useState, useMemo, useEffect } from 'react';
import { generateDatCsvFromSelections, generateRecapFromSelections } from '../../lib/optionsExport';
import {
  buildCityOptionId,
  buildSmartSelectionIds,
  findBestCity,
  getCityState,
  groupCitiesByKma,
  hydrateSelectionIdsFromSavedCities,
  mapSelectionIdsToSavedCities,
  normalizeCityName
} from '../../lib/citySelection';

import ManualCityAdd from './ManualCityAdd';

/**
 * Display component for lane options with selection capabilities
 * Shows origin and destination cities with KMAs, distances, and checkboxes
 */
export default function OptionsDisplay({
  laneId,
  lane,
  originOptions = [],
  destOptions = [],
  onSelectionChange,
  onManualAdd,
  initialSelections = null,
  onSaveSuccess = null,
  saveButtonLabel = 'Save Selections & Add to Recap'
}) {
  const [selectedOrigins, setSelectedOrigins] = useState(new Set());
  const [selectedDestinations, setSelectedDestinations] = useState(new Set());
  const [isHydrated, setIsHydrated] = useState(false);

  const originsByKMA = useMemo(() => groupCitiesByKma(originOptions), [originOptions]);
  const destsByKMA = useMemo(() => groupCitiesByKma(destOptions), [destOptions]);

  useEffect(() => {
    setSelectedOrigins(new Set());
    setSelectedDestinations(new Set());
    setIsHydrated(false);
  }, [laneId]);

  useEffect(() => {
    if (isHydrated) return;
    if (!originOptions.length && !destOptions.length) return;

    const savedOrigins = Array.isArray(lane?.saved_origin_cities)
      ? lane.saved_origin_cities
      : Array.isArray(lane?.saved_origins)
        ? lane.saved_origins
        : Array.isArray(lane?.origin_cities)
          ? lane.origin_cities
          : [];
    const savedDestinations = Array.isArray(lane?.saved_dest_cities)
      ? lane.saved_dest_cities
      : Array.isArray(lane?.saved_dests)
        ? lane.saved_dests
        : Array.isArray(lane?.dest_cities)
          ? lane.dest_cities
          : [];

    const hydratedOriginIds = Array.isArray(initialSelections?.origins) && initialSelections.origins.length > 0
      ? initialSelections.origins
      : hydrateSelectionIdsFromSavedCities(savedOrigins, originOptions);
    const hydratedDestinationIds = Array.isArray(initialSelections?.destinations) && initialSelections.destinations.length > 0
      ? initialSelections.destinations
      : hydrateSelectionIdsFromSavedCities(savedDestinations, destOptions);

    setSelectedOrigins(new Set(hydratedOriginIds));
    setSelectedDestinations(new Set(hydratedDestinationIds));
    setIsHydrated(true);
  }, [isHydrated, lane, originOptions, destOptions, initialSelections]);


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
            const cityId = buildCityOptionId(city);
            
            return (
              <div 
                key={cityId}
                className={`flex items-center gap-2 p-2 rounded ${
                  isSelected
                    ? 'bg-blue-500/35 border border-blue-300/45'
                    : 'bg-slate-900/42 border border-slate-300/35'
                } hover:bg-slate-800/45 transition-colors cursor-pointer`}
                onClick={() => onToggle(cityId)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(cityId)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 rounded border-slate-300/45 bg-slate-900/45 text-blue-500 focus:ring-blue-400 cursor-pointer"
                />
                
                <div className="flex-grow">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${isBest ? 'text-amber-200 font-bold' : city.isManual ? 'text-emerald-200 font-semibold' : 'text-slate-100'}`}>
                      {isBest && '⭐ '} {city.isManual && '➕ '}
                      {city.city}, {getCityState(city)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${isBest ? 'bg-amber-500/35 text-amber-100 border border-amber-300/45' : city.isManual ? 'bg-emerald-500/35 text-emerald-100 border border-emerald-300/45' : 'bg-slate-900/42 text-slate-100 border border-slate-300/35'}`}>
                      {city.kma_code || 'UNK'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-200">
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
        <div className="text-sm font-semibold text-slate-100 mb-2 px-2">
          {kmaDisplayName} ({cities.length} {cities.length === 1 ? 'city' : 'cities'})
        </div>
        <div className="space-y-1">
          {sortedCities.map(city => {
            const cityId = buildCityOptionId(city);
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
    const allOriginIds = originOptions.map((city) => buildCityOptionId(city));
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
    const allDestIds = destOptions.map((city) => buildCityOptionId(city));
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
    const { originIds: bestOriginIds, destinationIds: bestDestIds } = buildSmartSelectionIds(originOptions, destOptions);
    
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
      <div className="text-center text-slate-200 py-8">
        No options generated yet. Click Generate Options to see available cities.
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
      const selectedOriginCities = mapSelectionIdsToSavedCities(Array.from(selectedOrigins), originOptions);
      const selectedDestCities = mapSelectionIdsToSavedCities(Array.from(selectedDestinations), destOptions);

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

      if (typeof onSaveSuccess === 'function') {
        onSaveSuccess(result?.lane || null, {
          origins: Array.from(selectedOrigins),
          destinations: Array.from(selectedDestinations),
          totalCombinations: result?.totalCombinations || 0
        });
      } else {
        alert(`✅ Selections saved!\n\n${result.totalCombinations} lane combinations saved.\n\nView them in the Recap page.`);
      }
    } catch (error) {
      console.error('Error saving selections:', error);
      alert(`❌ Error saving selections: ${error.message}`);
    }
  };

  return (
    <div>
      {/* Smart Select Banner */}
      <div className="mb-4 p-4 bg-gradient-to-r from-violet-500/35 to-blue-500/35 border border-violet-300/45 rounded-lg shadow-[0_0_20px_rgba(99,102,241,0.2)]">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-grow">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">⚡</span>
              <h4 className="font-semibold text-violet-100">Smart Pairing</h4>
            </div>
            <p className="text-sm text-slate-100">
              Auto-select the <strong>best city from each KMA</strong> (closest to lane endpoints) for maximum market coverage
            </p>
          </div>
          <button
            onClick={handleSmartSelect}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded font-medium transition-colors whitespace-nowrap border border-violet-300/45"
          >
            ⚡ Smart Select Best Cities
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        {/* Origin Cities Panel */}
        <div className="bg-slate-900/42 border border-slate-300/35 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-100">
              Pickup Cities ({originOptions.length})
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAllOrigins}
                className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded border border-blue-300/45"
              >
                Select All
              </button>
              <button
                onClick={handleClearAllOrigins}
                className="text-xs px-2 py-1 bg-slate-700/70 hover:bg-slate-600/80 text-slate-100 rounded border border-slate-300/35"
              >
                Clear
              </button>
              <div className="text-sm text-slate-200 ml-2">
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
               const cityId = buildCityOptionId({
                 ...city,
                 state: getCityState(city)
               });
               
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
        <div className="bg-slate-900/42 border border-slate-300/35 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-100">
              Delivery Cities ({destOptions.length})
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAllDestinations}
                className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded border border-blue-300/45"
              >
                Select All
              </button>
              <button
                onClick={handleClearAllDestinations}
                className="text-xs px-2 py-1 bg-slate-700/70 hover:bg-slate-600/80 text-slate-100 rounded border border-slate-300/35"
              >
                Clear
              </button>
              <div className="text-sm text-slate-200 ml-2">
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
               const cityId = buildCityOptionId({
                 ...city,
                 state: getCityState(city)
               });
               
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
      <div className="mt-6 p-4 bg-slate-900/42 border border-slate-300/35 rounded-lg">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-sm text-slate-100">
            {hasSelections ? (
              <>
                <span className="font-semibold text-emerald-200">{totalCombinations} lane combinations</span> will be created
                <span className="text-slate-300 ml-2">
                  ({selectedOrigins.size} pickup × {selectedDestinations.size} delivery)
                </span>
                <div className="text-xs text-slate-200 mt-1">
                  {Object.keys(originsByKMA).length} pickup KMAs · {Object.keys(destsByKMA).length} delivery KMAs available
                </div>
              </>
            ) : (
              <span className="text-slate-200">Select at least one pickup and one delivery city</span>
            )}
          </div>
        </div>
        
        <div className="flex gap-3 flex-wrap">
          <button
            disabled={!hasSelections}
            onClick={handleSaveSelections}
            className={`flex-1 min-w-[200px] px-4 py-2 rounded font-medium transition-colors ${
              hasSelections
                ? 'bg-violet-600 hover:bg-violet-500 text-white border border-violet-300/45'
                : 'bg-slate-700/70 text-slate-400 cursor-not-allowed'
            }`}
          >
            💾 {saveButtonLabel}
          </button>
          
          <button
            disabled={!hasSelections}
            onClick={handleGenerateCsv}
            className={`flex-1 min-w-[180px] px-4 py-2 rounded font-medium transition-colors ${
              hasSelections
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-300/45'
                : 'bg-slate-700/70 text-slate-400 cursor-not-allowed'
            }`}
          >
            📄 Generate DAT CSV
          </button>
          
          <button
            disabled={!hasSelections}
            onClick={handleGenerateRecap}
            className={`flex-1 min-w-[180px] px-4 py-2 rounded font-medium transition-colors ${
              hasSelections
                ? 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-300/45'
                : 'bg-slate-700/70 text-slate-400 cursor-not-allowed'
            }`}
          >
            📋 Export HTML Recap
          </button>
        </div>
      </div>
    </div>
  );
}
