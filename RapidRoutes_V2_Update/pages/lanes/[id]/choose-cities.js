// ============================================================================
// City Picker Page - Broker selects which cities to post
// ============================================================================
// Purpose: Professional UI for selecting origin/destination cities by KMA
// Features: Bulk KMA selection, individual checkboxes, instant save
// ============================================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Button, Card, Badge, Checkbox, Spinner } from '../../../components/EnterpriseUI';

export default function ChooseCitiesPage() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [cityData, setCityData] = useState(null);
  const [selectedOrigins, setSelectedOrigins] = useState([]);
  const [selectedDests, setSelectedDests] = useState([]);
  const [hasSavedChoices, setHasSavedChoices] = useState(false);

  // Fetch nearby cities when page loads
  useEffect(() => {
    if (!id) return;

    const fetchCities = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/lanes/${id}/nearby-cities`);
        if (!response.ok) throw new Error('Failed to fetch cities');
        const data = await response.json();
        setCityData(data);

        // Auto-select "Market Cities" (cities matching the KMA name)
        // This ensures the "best" city is selected by default
        const newOrigins = [];
        const newDests = [];

        // Helper to find market cities in a KMA map
        const findMarketCities = (kmaMap) => {
          const suggestions = [];
          if (!kmaMap) return suggestions;
          
          Object.values(kmaMap).forEach(cities => {
            // Find the city that matches the KMA name (e.g., "Chicago" in "Chicago Mkt")
            // robustly handle " Mkt" suffix
            const marketCity = cities.find(c => {
               if (!c.kma_name) return false;
               const kmaName = c.kma_name.toLowerCase().replace(/\s+(mkt|market)\s*$/i, '').trim();
               const cityName = c.city.toLowerCase().trim();
               return kmaName === cityName;
            });
            
            // If found, select it.
            if (marketCity) {
              suggestions.push(marketCity);
            }
          });
          return suggestions;
        };

        // Get suggestions
        const originSuggestions = findMarketCities(data.origin?.nearby_cities?.kmas);
        const destSuggestions = findMarketCities(data.destination?.nearby_cities?.kmas);
        
        // Filter destination suggestions based on business rules (same as render logic)
        // This prevents auto-selecting PA/NY cities for purely New England lanes
        const destState = (data.destination?.state || '').toString().toUpperCase();
        const originState = (data.origin?.state || '').toString().toUpperCase();
        const NEW_ENGLAND = new Set(['MA', 'NH', 'ME', 'VT', 'RI', 'CT']);
        
        const enforceNE = NEW_ENGLAND.has(destState);
        const isNJLane = originState === 'NJ' || destState === 'NJ';

        const validDestSuggestions = destSuggestions.filter(c => {
          if (enforceNE && !isNJLane) {
            const state = (c.state || '').toString().toUpperCase();
            // Allow NE states and NJ
            return NEW_ENGLAND.has(state) || state === 'NJ';
          }
          return true;
        });

        setSelectedOrigins(originSuggestions);
        setSelectedDests(validDestSuggestions);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCities();

    // Check for existing saved choices
    const checkSavedChoices = async () => {
      try {
        const res = await fetch(`/api/lanes/${id}/save-choices?t=${Date.now()}`); // Cache bust
        if (res.ok) {
          const data = await res.json();
          if (data && (Array.isArray(data.origin_cities) && data.origin_cities.length > 0)) {
            setHasSavedChoices(true);
            // Optionally populate the selection from saved data instead of "Smart Select"
            // For now, we just enable the Delete button
            
            // If we wanted to load them:
            // setSelectedOrigins(data.origin_cities);
            // setSelectedDests(data.dest_cities);
          }
        }
      } catch (err) {
        console.error('Failed to check saved choices:', err);
      }
    };
    checkSavedChoices();

  }, [id]);

  // Handle individual city checkbox toggle
  const toggleCity = (side, cityObj) => {
    const key = `${cityObj.city}-${cityObj.state}-${cityObj.zip}`;
    
    if (side === 'origin') {
      setSelectedOrigins(prev => 
        prev.some(c => `${c.city}-${c.state}-${c.zip}` === key)
          ? prev.filter(c => `${c.city}-${c.state}-${c.zip}` !== key)
          : [...prev, cityObj]
      );
    } else {
      setSelectedDests(prev => 
        prev.some(c => `${c.city}-${c.state}-${c.zip}` === key)
          ? prev.filter(c => `${c.city}-${c.state}-${c.zip}` !== key)
          : [...prev, cityObj]
      );
    }
  };

  // Handle "Select All KMA" button
  const selectAllKMA = (side, kmaCode, cities) => {
    if (side === 'origin') {
      setSelectedOrigins(prev => {
        const newCities = cities.filter(c => 
          !prev.some(p => `${p.city}-${p.state}-${p.zip}` === `${c.city}-${c.state}-${c.zip}`)
        );
        return [...prev, ...newCities];
      });
    } else {
      setSelectedDests(prev => {
        const newCities = cities.filter(c => 
          !prev.some(p => `${p.city}-${p.state}-${p.zip}` === `${c.city}-${c.state}-${c.zip}`)
        );
        return [...prev, ...newCities];
      });
    }
  };

  // Reset/Delete Saved Choices
  const handleDeleteChoices = async () => {
    if (!confirm('Are you sure you want to delete these saved city choices? This cannot be undone.')) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/lanes/${id}/delete-choices`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete choices');

      alert('✅ Choices deleted. You can now select new cities.');
      
      // Reset local state
      setHasSavedChoices(false);
      setSelectedOrigins([]);
      setSelectedDests([]);
      
      // Reload page to re-trigger auto-selection logic if desired, or just leave empty
      // router.reload(); // Optional: reload to get fresh defaults

    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Save selections to database
  const handleSave = async () => {
    if (selectedOrigins.length === 0 || selectedDests.length === 0) {
      alert('Please select at least one origin city and one destination city');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/lanes/${id}/save-choices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin_cities: selectedOrigins,
          dest_cities: selectedDests
        })
      });

      if (!response.ok) throw new Error('Failed to save choices');
      const result = await response.json();

      alert(`✅ Saved successfully!\nRR Number: ${result.rr_number}\nTotal pairs: ${result.total_pairs}`);
      
      // Mark that choices have been saved
      setHasSavedChoices(true);

      // Keep user on page so they can export DAT CSV
      // router.push('/lanes');  // Commented out - stay on page

    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Export DAT CSV
  const handleExportDatCsv = async () => {
    try {
      setExporting(true);
      
      const response = await fetch(`/api/lanes/${id}/export-dat-csv`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Export failed');
      }

      // Download file
      const blob = await response.blob();
  const url = globalThis.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DAT_Lane_${id}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
  a.remove();
  globalThis.URL.revokeObjectURL(url);

      alert('✅ DAT CSV exported successfully!');
      
    } catch (err) {
      console.error('Export failed:', err);
      alert(`❌ Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  // Render city checkbox list for a single KMA
  const renderKMASection = (side, kmaCode, cities) => {
    const selected = side === 'origin' ? selectedOrigins : selectedDests;
    const selectedCount = cities.filter(c => 
      selected.some(s => `${s.city}-${s.state}-${s.zip}` === `${c.city}-${c.state}-${c.zip}`)
    ).length;

    // Sort cities: Market City (matching KMA Name) goes first, then by mileage
    const sortedCities = [...cities].sort((a, b) => {
      // Robust matcher: Handle " Mkt", " Market", trailing spaces, case-insensitivity
      const cleanKma = (name) => (name || '').toLowerCase().replace(/\s+(mkt|market)\s*$/i, '').trim();
      const cleanCity = (name) => (name || '').toLowerCase().trim();

      const kmaNameA = cleanKma(a.kma_name);
      const cityNameA = cleanCity(a.city);
      const aIsMarket = kmaNameA === cityNameA;

      const kmaNameB = cleanKma(b.kma_name);
      const cityNameB = cleanCity(b.city);
      const bIsMarket = kmaNameB === cityNameB;
      
      if (aIsMarket && !bIsMarket) return -1;
      if (!aIsMarket && bIsMarket) return 1;
      return (a.miles || 0) - (b.miles || 0);
    });

    // Get readable KMA display name (e.g., "Chicago KMA" instead of "IL_CHI")
    // Use the first available kma_name, replace "Mkt"/"Market" with "KMA"
    const rawKmaName = cities.find(c => c.kma_name)?.kma_name;
    const kmaDisplayName = rawKmaName 
      ? rawKmaName.replace(/\s+(Mkt|Market)\s*$/i, ' KMA') 
      : kmaCode;

    return (
      <div key={kmaCode} className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Badge variant="kma">{kmaDisplayName}</Badge>
            <span className="text-sm text-gray-400">
              {cities.length} cities • {selectedCount} selected
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => selectAllKMA(side, kmaCode, cities)}
          >
            Select All
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {sortedCities.map((city) => {
            const key = `${city.city}-${city.state}-${city.zip}`;
            const isSelected = selected.some(c => `${c.city}-${c.state}-${c.zip}` === key);
            
            const cleanKma = (name) => (name || '').toLowerCase().replace(/\s+(mkt|market)\s*$/i, '').trim();
            const cleanCity = (name) => (name || '').toLowerCase().trim();
            const isMarketCity = cleanKma(city.kma_name) === cleanCity(city.city);
            
            return (
              <Checkbox
                key={key}
                checked={isSelected}
                onChange={() => toggleCity(side, city)}
                label={
                  <span className={isMarketCity ? 'font-bold text-yellow-400 flex items-center gap-1' : ''}>
                    {isMarketCity && '⭐ '}
                    {city.city}, {city.state}
                    <span className={isMarketCity ? 'text-yellow-400/70 font-normal ml-1' : 'text-gray-500 ml-1'}>
                       ({city.miles} mi)
                    </span>
                  </span>
                }
              />
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Card>
          <p className="text-red-400">Error: {error}</p>
          <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
        </Card>
      </div>
    );
  }

  const originKMAs = cityData?.origin?.nearby_cities?.kmas || {};
  let destKMAs = cityData?.destination?.nearby_cities?.kmas || {};

  // Client-side safety: For New England destination lanes, strictly show only NE states + NJ (major freight corridor)
  // For NJ lanes, show all cities (no filtering needed)
  const NEW_ENGLAND = new Set(['MA', 'NH', 'ME', 'VT', 'RI', 'CT']);
  const destState = (cityData?.destination?.state || '').toString().toUpperCase();
  const originState = (cityData?.origin?.state || '').toString().toUpperCase();
  const enforceNE = NEW_ENGLAND.has(destState);
  const isNJLane = originState === 'NJ' || destState === 'NJ';
  
  if (enforceNE && !isNJLane) {
    const filtered = {};
    for (const [kma, cities] of Object.entries(destKMAs)) {
      const kept = (cities || []).filter(c => {
        const state = (c.state || '').toString().toUpperCase();
        return NEW_ENGLAND.has(state) || state === 'NJ';
      });
      if (kept.length > 0) filtered[kma] = kept;
    }
    destKMAs = filtered;
  }

  return (
    <>
      <Head>
        <title>Choose Cities - RapidRoutes</title>
      </Head>

      <div className="min-h-screen bg-slate-950 text-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="mb-6">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
              ← Back to Lanes
            </Button>
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Choose Cities to Post</h1>
            <p className="text-gray-400">
              Select 5-10 cities for pickup and delivery. Cities are grouped by KMA.
            </p>
          </div>

          {/* Selection Summary */}
          <Card className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-8">
                <div>
                  <span className="text-gray-400">Origin Cities:</span>
                  <span className="ml-2 text-xl font-bold text-blue-400">{selectedOrigins.length}</span>
                </div>
                <div>
                  <span className="text-gray-400">Destination Cities:</span>
                  <span className="ml-2 text-xl font-bold text-blue-400">{selectedDests.length}</span>
                </div>
                <div>
                  <span className="text-gray-400">Total Pairs:</span>
                  <span className="ml-2 text-xl font-bold text-green-400">
                    {selectedOrigins.length * selectedDests.length}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-3">
                {hasSavedChoices && (
                  <Button
                    variant="danger"
                    onClick={handleDeleteChoices}
                    disabled={saving}
                    title="Delete saved choices and start over"
                  >
                    🗑️ Reset
                  </Button>
                )}
                
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving || selectedOrigins.length === 0 || selectedDests.length === 0}
                >
                  {saving ? <Spinner size="sm" /> : 'Save Choices'}
                </Button>
                
                <Button
                  variant="success"
                  onClick={handleExportDatCsv}
                  disabled={exporting || !hasSavedChoices}
                  title={hasSavedChoices ? 'Download DAT CSV file' : 'Save choices first'}
                >
                  {exporting ? <Spinner size="sm" /> : '📥 Export DAT CSV'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Two-column layout */}
          <div className="grid grid-cols-2 gap-6">
            
            {/* Origin Cities */}
            <Card>
              <h2 className="text-xl font-bold mb-1">Pickup Cities</h2>
              <p className="text-sm text-gray-400 mb-6">
                From: {cityData?.origin?.city}, {cityData?.origin?.state}
              </p>
              
              {Object.keys(originKMAs).length === 0 ? (
                <p className="text-gray-500 italic">No nearby cities found</p>
              ) : (
                Object.entries(originKMAs).map(([kmaCode, cities]) => 
                  renderKMASection('origin', kmaCode, cities)
                )
              )}
            </Card>

            {/* Destination Cities */}
            <Card>
              <h2 className="text-xl font-bold mb-1">Delivery Cities</h2>
              <p className="text-sm text-gray-400 mb-6">
                To: {cityData?.destination?.city}, {cityData?.destination?.state}
              </p>
              
              {Object.keys(destKMAs).length === 0 ? (
                <p className="text-gray-500 italic">No nearby cities found</p>
              ) : (
                Object.entries(destKMAs).map(([kmaCode, cities]) => 
                  renderKMASection('destination', kmaCode, cities)
                )
              )}
            </Card>

          </div>

        </div>
      </div>
    </>
  );
}
