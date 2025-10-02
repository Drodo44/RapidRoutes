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
import { theme } from '../../../styles/enterprise-theme';

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
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCities();
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
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DAT_Lane_${id}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

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

    return (
      <div key={kmaCode} className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Badge variant="kma">{kmaCode}</Badge>
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
          {cities.map((city, idx) => {
            const key = `${city.city}-${city.state}-${city.zip}`;
            const isSelected = selected.some(c => `${c.city}-${c.state}-${c.zip}` === key);
            
            return (
              <Checkbox
                key={idx}
                checked={isSelected}
                onChange={() => toggleCity(side, city)}
                label={`${city.city}, ${city.state} (${city.miles} mi)`}
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
  const destKMAs = cityData?.destination?.nearby_cities?.kmas || {};

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
                  title={!hasSavedChoices ? 'Save choices first' : 'Download DAT CSV file'}
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
