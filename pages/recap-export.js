// pages/recap-export.js
// Print-friendly HTML export for Recap. Accepts ?ids=<comma-separated UUIDs>.
// Fetches lanes client-side and renders compact, printable cards with AI insights.

import { useEffect, useMemo, useState } from 'react';
import supabase from '../utils/supabaseClient';
import Head from 'next/head';
import { getDisplayReferenceId, matchesReferenceId, cleanReferenceId } from '../lib/referenceIdUtils';
import ThemeToggle from '../components/ThemeToggle';

// Generate reference ID for generated pairs (same logic as CSV)
function generatePairReferenceId(baseRefId, pairIndex) {
  const baseRef = cleanReferenceId(baseRefId);
  if (baseRef && /^RR\d{5}$/.test(baseRef)) {
    // Extract numeric part and increment for pairs
    const baseNum = parseInt(baseRef.slice(2), 10);
    const pairNum = (baseNum + pairIndex + 1) % 100000;
    return `RR${String(pairNum).padStart(5, '0')}`;
  }
  // Fallback
  return `RR${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
}

export default function RecapExport() {
  const [lanes, setLanes] = useState([]);
  const [postedPairs, setPostedPairs] = useState([]);
  const [recaps, setRecaps] = useState({});
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLanes, setFilteredLanes] = useState([]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const idsParam = url.searchParams.get('ids');
    const ids = idsParam ? idsParam.split(',').map((s) => s.trim()).filter(Boolean) : [];
    
    async function fetchLanes() {
      setLoading(true);
      if (ids.length === 0) {
        // fallback to current lanes
        const { data } = await supabase
          .from('lanes')
          .select('*')
          .eq('lane_status', 'current')
          .limit(200);
        setLanes(data || []);
        setLoading(false);
        return data || [];
      }
      
      const { data } = await supabase
        .from('lanes')
        .select('*')
        .in('id', ids)
        .limit(500);
      setLanes(data || []);
      setLoading(false);
      return data || [];
    }
    
    async function loadData() {
      const lanesData = await fetchLanes();
      if (lanesData.length > 0) {
        await fetchAIRecaps(lanesData.map(l => l.id));
        
        // Load saved city pairs for lanes with selections
        const allPairs = [];
        
        for (const lane of lanesData) {
          // Check if lane has saved city selections
          if (lane.saved_origin_cities?.length > 0 && lane.saved_dest_cities?.length > 0) {
            const baseRefId = getDisplayReferenceId(lane);
            const numPairs = Math.min(lane.saved_origin_cities.length, lane.saved_dest_cities.length);
            
            // Generate pair entries (one-to-one pairing)
            for (let i = 0; i < numPairs; i++) {
              const originCity = lane.saved_origin_cities[i];
              const destCity = lane.saved_dest_cities[i];
              const pairRefId = generatePairReferenceId(baseRefId, i);
              
              allPairs.push({
                id: `pair-${lane.id}-${i}`,
                laneId: lane.id,
                isBase: false,
                display: `${originCity.city}, ${originCity.state || originCity.state_or_province} → ${destCity.city}, ${destCity.state || destCity.state_or_province}`,
                referenceId: pairRefId,
                baseReferenceId: baseRefId,
                pickup: {
                  city: originCity.city,
                  state: originCity.state || originCity.state_or_province,
                  zip: originCity.zip
                },
                delivery: {
                  city: destCity.city,
                  state: destCity.state || destCity.state_or_province,
                  zip: destCity.zip
                }
              });
            }
          }
        }
        
        setPostedPairs(allPairs);
      }
    }
    
    loadData();
  }, []);

  const fetchAIRecaps = async (laneIds) => {
    setAiLoading(true);
    try {
      const response = await fetch('/api/ai/recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ laneIds })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch recaps');
      }
      
      const data = await response.json();
      if (data.results?.length) {
        const recapMap = {};
        data.results.forEach(recap => {
          recapMap[recap.laneId] = recap;
        });
        setRecaps(recapMap);
      }
    } catch (error) {
      console.error('Error fetching recaps:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const printNow = () => window.print();

  // Search functionality - enhanced to include all posted pairs
  const matches = (lane, query) => {
    if (!query) return true;
    
    const q = query.toLowerCase().trim();
    
    // Check main lane reference ID using unified logic
    if (matchesReferenceId(q, lane)) return true;
    
    // Check generated pair reference IDs
    const lanePairs = postedPairs.filter(pair => pair.laneId === lane.id);
    for (const pair of lanePairs) {
      const pairRefId = pair.referenceId || '';
      if (pairRefId.toLowerCase().includes(q)) return true;
      
      // Also check pair cities
      const pairOrigin = `${pair.pickup.city}, ${pair.pickup.state}`.toLowerCase();
      const pairDest = `${pair.delivery.city}, ${pair.delivery.state}`.toLowerCase();
      if (pairOrigin.includes(q) || pairDest.includes(q)) return true;
    }
    
    // Check origin and destination
    const origin = `${lane.origin_city || ''}, ${lane.origin_state || ''}`.toLowerCase();
    const dest = `${lane.dest_city || ''}, ${lane.dest_state || ''}`.toLowerCase();
    
    if (origin.includes(q) || dest.includes(q)) return true;
    
    // Check equipment
    const equipment = lane.equipment_code?.toLowerCase() || '';
    if (equipment.includes(q)) return true;
    
    // Check commodity
    const commodity = lane.commodity?.toLowerCase() || '';
    if (commodity.includes(q)) return true;
    
    return false;
  };

  // Update filtered lanes when search changes
  useEffect(() => {
    setFilteredLanes(lanes.filter(lane => matches(lane, searchQuery)));
  }, [lanes, searchQuery]);

  const scrollToLane = (laneId) => {
    const element = document.getElementById(`lane-${laneId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.style.backgroundColor = '#fef3c7';
      setTimeout(() => {
        element.style.backgroundColor = '';
      }, 2000);
    }
  };

  const groups = useMemo(() => {
    // group by equipment to provide a little structure
    const lanesToGroup = searchQuery ? filteredLanes : lanes;
    const m = new Map();
    for (const l of lanesToGroup) {
      const k = (l.equipment_code || 'Other').toUpperCase();
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(l);
    }
    return Array.from(m.entries());
  }, [lanes, filteredLanes, searchQuery]);

  const formatDate = () => {
    const now = new Date();
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return now.toLocaleDateString('en-US', options);
  };

  const generateCSV = async (contactMethod) => {
    try {
      const response = await fetch(`/api/exportSavedCitiesCsv?contactMethod=${contactMethod}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DAT_Export_${contactMethod}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert(`CSV generated successfully for ${contactMethod}!`);
    } catch (error) {
      console.error('CSV Generation Error:', error);
      alert(`Failed to generate CSV: ${error.message}`);
    }
  };

  return (
    <>
      <Head>
        <title>Recap Export | RapidRoutes</title>
      </Head>
      
      <div style={{ 
        padding: '24px', 
        background: 'var(--bg-primary)', 
        color: 'var(--text-primary)', 
        minHeight: '100vh' 
      }}>
        <div className="no-print mb-6 flex items-center justify-between">
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              RapidRoutes – Posting Recap
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Generated on {formatDate()}
            </p>
          </div>
          
          <div className="flex gap-3 items-center">
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* Search Bar */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search reference ID, city, equipment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--border-default)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  width: '256px',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    padding: '8px 12px',
                    color: 'var(--text-secondary)',
                    background: 'transparent'
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Lane Dropdown - Updated to use posted pairs */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  const selectedValue = e.target.value;
                  
                  let targetLaneId;
                  
                  if (selectedValue.startsWith('pending-')) {
                    targetLaneId = parseInt(selectedValue.replace('pending-', ''));
                  } else if (selectedValue.includes('-')) {
                    const parts = selectedValue.split('-');
                    targetLaneId = parseInt(parts[1]);
                  }
                  
                  if (targetLaneId) {
                    scrollToLane(targetLaneId);
                  }
                  e.target.value = '';
                }
              }}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                fontSize: '13px',
                maxWidth: '320px',
                background: 'var(--surface)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="">Jump to lane...</option>
              {/* Current lanes with their pairs */}
              {lanes.filter(lane => (lane.lane_status || lane.status) === 'current').map(lane => {
                const lanePostedPairs = postedPairs.filter(pair => pair.laneId === lane.id);
                const basePair = lanePostedPairs.find(pair => pair.isBase);
                const generatedPairs = lanePostedPairs.filter(pair => !pair.isBase);
                
                return lanePostedPairs.length > 0 ? (
                  <optgroup key={lane.id} label={`${lane.origin_city || '?'}, ${lane.origin_state || '?'} → ${lane.dest_city || '?'}, ${lane.dest_state || '?'} • REF #${getDisplayReferenceId(lane)} • ${lanePostedPairs.length} pairs`}>
                    {basePair && (
                      <option value={basePair.id}>🎯 BASE: {basePair.display} • {basePair.referenceId}</option>
                    )}
                    {generatedPairs.slice(0, 15).map((pair, index) => (
                      <option key={pair.id} value={pair.id}>📊 PAIR {index + 1}: {pair.display} • {pair.referenceId}</option>
                    ))}
                    {generatedPairs.length > 15 && (
                      <option disabled>... and {generatedPairs.length - 15} more pairs</option>
                    )}
                  </optgroup>
                ) : null;
              })}
              {/* Archived lanes */}
              {lanes.filter(lane => (lane.lane_status || lane.status) === 'archive').length > 0 && (
                <optgroup label="📦 ARCHIVED LANES">
                  {lanes.filter(lane => (lane.lane_status || lane.status) === 'archive').slice(0, 10).map((lane) => (
                    <option key={`archive-${lane.id}`} value={`archive-${lane.id}`}>
                      📦 {lane.origin_city || '?'}, {lane.origin_state || '?'} → {lane.dest_city || '?'}, {lane.dest_state || '?'} • REF #{getDisplayReferenceId(lane)}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            {aiLoading && <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading AI insights...</div>}
            
            <button 
              onClick={() => {
                // Get all lane data for the dropdown
                const laneOptions = filteredLanes.map(lane => {
                  const lanePostedPairs = postedPairs.filter(pair => pair.laneId === lane.id);
                  return {
                    id: lane.id,
                    refId: getDisplayReferenceId(lane),
                    origin: `${lane.origin_city}, ${lane.origin_state}`,
                    dest: `${lane.dest_city}, ${lane.dest_state}`,
                    pairs: lanePostedPairs
                  };
                });
                
                // Create full standalone HTML document with all features
                const htmlContent = `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RapidRoutes Posting Recap - ${formatDate()}</title>
  <style>
    :root[data-theme="light"] {
      --bg-primary: #f8fafc;
      --bg-secondary: #f1f5f9;
      --bg-tertiary: #e2e8f0;
      --surface: #ffffff;
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --text-tertiary: #64748b;
      --border-default: #cbd5e1;
      --primary: #3b82f6;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
    }
    :root[data-theme="dark"] {
      --bg-primary: #0f172a;
      --bg-secondary: #1e293b;
      --bg-tertiary: #334155;
      --surface: #1e293b;
      --text-primary: #f8fafc;
      --text-secondary: #cbd5e1;
      --text-tertiary: #94a3b8;
      --border-default: #475569;
      --primary: #60a5fa;
      --success: #34d399;
      --warning: #fbbf24;
      --danger: #f87171;
    }
    body {
      background: var(--bg-primary);
      color: var(--text-primary);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      margin: 0;
      padding: 20px;
      transition: background 0.2s, color 0.2s;
    }
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start;
      margin-bottom: 24px; 
    }
    .controls { 
      display: flex; 
      gap: 12px; 
      align-items: center;
      flex-wrap: wrap;
    }
    .search-input, .lane-select {
      padding: 8px 12px;
      border: 1px solid var(--border-default);
      border-radius: 8px;
      font-size: 13px;
      background: var(--surface);
      color: var(--text-primary);
    }
    .search-input { width: 256px; }
    .lane-select { max-width: 320px; }
    .btn {
      padding: 8px 16px;
      border-radius: 8px;
      border: none;
      font-weight: 500;
      cursor: pointer;
      font-size: 13px;
      transition: background 0.2s;
    }
    .btn-primary {
      background: var(--primary);
      color: white;
    }
    .btn-primary:hover {
      opacity: 0.9;
    }
    .section {
      margin-bottom: 24px;
    }
    .section h2 {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 16px;
      color: var(--text-primary);
    }
    .lane-card {
      background: var(--surface);
      border: 1px solid var(--border-default);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      transition: box-shadow 0.3s;
    }
    .lane-card.highlight {
      box-shadow: 0 0 0 4px var(--primary);
    }
    .lane-header {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 8px;
      color: var(--text-primary);
    }
    .lane-details {
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 12px;
    }
    .pair-list {
      margin-top: 12px;
    }
    .pair-item {
      font-size: 12px;
      padding: 4px 0;
      display: flex;
      justify-content: space-between;
      color: var(--text-secondary);
    }
    .ref-badge {
      background: var(--bg-tertiary);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      color: var(--text-primary);
    }
    .hidden { display: none; }
    @media print {
      .controls, .no-print { display: none !important; }
      body { background: white; color: black; }
      .lane-card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 style="font-size: 20px; font-weight: bold; margin: 0;">RapidRoutes – Posting Recap</h1>
      <p style="font-size: 13px; color: var(--text-secondary); margin: 4px 0 0 0;">Generated on ${formatDate()}</p>
    </div>
    <div class="controls no-print">
      <button id="themeToggle" class="btn btn-primary" onclick="toggleTheme()">
        <span id="themeIcon">🌙</span> <span id="themeText">Dark</span>
      </button>
      <input 
        type="text" 
        id="searchInput" 
        class="search-input" 
        placeholder="Search RR#, city, equipment..."
        onkeyup="handleSearch()"
      />
      <select id="laneSelect" class="lane-select" onchange="handleLaneJump(this.value)">
        <option value="">Jump to lane...</option>
        ${laneOptions.map(lane => `<option value="${lane.id}">${lane.refId} • ${lane.origin} → ${lane.dest}</option>`).join('')}
      </select>
      <button class="btn btn-primary" onclick="window.print()">🖨️ Print</button>
    </div>
  </div>

  <div id="content">
${document.querySelector('#content')?.innerHTML || ''}
  </div>

  <script>
    // Theme toggle
    function toggleTheme() {
      const html = document.documentElement;
      const currentTheme = html.getAttribute('data-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      html.setAttribute('data-theme', newTheme);
      
      const icon = document.getElementById('themeIcon');
      const text = document.getElementById('themeText');
      if (newTheme === 'dark') {
        icon.textContent = '☀️';
        text.textContent = 'Light';
      } else {
        icon.textContent = '🌙';
        text.textContent = 'Dark';
      }
      
      localStorage.setItem('theme', newTheme);
    }
    
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (savedTheme === 'dark') {
      document.getElementById('themeIcon').textContent = '☀️';
      document.getElementById('themeText').textContent = 'Light';
    }
    
    // Search functionality
    function handleSearch() {
      const query = document.getElementById('searchInput').value.toLowerCase();
      const cards = document.querySelectorAll('.lane-card');
      
      cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(query)) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    }
    
    // Lane navigation
    function handleLaneJump(laneId) {
      if (!laneId) return;
      
      const element = document.getElementById('lane-' + laneId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('highlight');
        setTimeout(() => {
          element.classList.remove('highlight');
        }, 2000);
      }
      
      document.getElementById('laneSelect').value = '';
    }
  </script>
</body>
</html>`;
                
                const blob = new Blob([htmlContent], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `RapidRoutes-Recap-${new Date().toISOString().split('T')[0]}.html`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              style={{
                borderRadius: '8px',
                background: 'var(--success)',
                color: 'white',
                fontWeight: '500',
                padding: '8px 16px',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--success-hover)'}
              onMouseLeave={(e) => e.target.style.background = 'var(--success)'}
            >
              💾 Download HTML
            </button>
            
            <button 
              onClick={printNow} 
              style={{
                borderRadius: '8px',
                background: 'var(--primary)',
                color: 'white',
                fontWeight: '500',
                padding: '8px 16px',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--primary-hover)'}
              onMouseLeave={(e) => e.target.style.background = 'var(--primary)'}
            >
              🖨️ Print Document
            </button>
          </div>
        </div>

        {loading && <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading lanes...</div>}

        {/* Search Results Info */}
        {!loading && searchQuery && (
          <div className="no-print mb-4" style={{
            padding: '12px',
            background: 'var(--primary-alpha)',
            border: '1px solid var(--primary)',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '13px', color: 'var(--primary-text)' }}>
              Found {filteredLanes.length} lane{filteredLanes.length !== 1 ? 's' : ''} matching "{searchQuery}"
            </div>
          </div>
        )}

        <div className="print-header no-screen">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-default)',
            paddingBottom: '16px',
            marginBottom: '24px'
          }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                RapidRoutes Posting Recap
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Generated on {formatDate()}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                RapidRoutes Logistics
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Enterprise Freight Solutions
              </div>
            </div>
          </div>
        </div>

        <div id="content">
          {!loading && groups.map(([equip, arr]) => (
          <section key={equip} style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              borderBottom: '1px solid var(--border-default)',
              paddingBottom: '8px',
              marginBottom: '12px',
              color: 'var(--text-primary)'
            }}>
              {equip === 'V' ? 'Dry Van' : 
               equip === 'R' ? 'Reefer' : 
               equip === 'F' || equip === 'FD' ? 'Flatbed' : 
               equip} Lanes
            </h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
              gap: '16px'
            }}>
              {arr.map((lane) => {
                const recap = recaps[lane.id];
                const baseRefId = getDisplayReferenceId(lane);
                
                // Generate pairs from saved cities
                const hasSavedCities = lane.saved_origin_cities?.length > 0 && lane.saved_dest_cities?.length > 0;
                const pairs = [];
                
                if (hasSavedCities) {
                  const numPairs = Math.min(lane.saved_origin_cities.length, lane.saved_dest_cities.length);
                  for (let i = 0; i < numPairs; i++) {
                    const pairRefId = generatePairReferenceId(baseRefId, i);
                    const originCity = lane.saved_origin_cities[i];
                    const destCity = lane.saved_dest_cities[i];
                    pairs.push({
                      refId: pairRefId,
                      pickup: originCity,
                      delivery: destCity
                    });
                  }
                }
                
                return (
                  <article 
                    key={lane.id} 
                    id={`lane-${lane.id}`}
                    className="lane-card"
                    style={{
                      borderRadius: '8px',
                      border: '1px solid var(--border-default)',
                      overflow: 'hidden',
                      breakInside: 'avoid',
                      background: 'var(--surface)'
                    }}
                  >
                    <div style={{ 
                      background: 'var(--bg-secondary)', 
                      padding: '12px' 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: '500', fontSize: '16px', color: 'var(--text-primary)' }}>
                          {lane.origin_city || '?'}, {lane.origin_state || '?'} 
                          <span style={{ color: 'var(--text-secondary)', margin: '0 8px' }}>→</span> 
                          {lane.dest_city || lane.destination_city || '?'}, {lane.dest_state || lane.destination_state || '?'}
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          fontFamily: 'monospace', 
                          color: 'var(--text-secondary)',
                          background: 'var(--surface)',
                          padding: '4px 8px',
                          borderRadius: '4px'
                        }}>
                          {baseRefId}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        <span style={{ fontWeight: '500' }}>
                          {(lane.equipment_code || '?') === 'V' ? 'Dry Van' : 
                           (lane.equipment_code || '?') === 'R' ? 'Reefer' : 
                           (lane.equipment_code || '?') === 'F' || (lane.equipment_code || '?') === 'FD' ? 'Flatbed' : 
                           (lane.equipment_code || '?')} • {lane.length_ft || '?'}ft
                        </span>
                        <span style={{ marginLeft: '8px' }}>
                          {lane.randomize_weight 
                            ? `${lane.weight_min?.toLocaleString() || '?'}-${lane.weight_max?.toLocaleString() || '?'} lbs` 
                            : `${lane.weight_lbs?.toLocaleString() || '—'} lbs`}
                        </span>
                        <span style={{ marginLeft: '8px' }}>Pickup: {lane.pickup_earliest || '?'} → {lane.pickup_latest || '?'}</span>
                      </div>
                    </div>
                    
                    <div style={{ padding: '12px' }}>
                      {/* Show saved city pairs */}
                      {pairs.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <h4 style={{ 
                            fontSize: '13px', 
                            fontWeight: '500', 
                            color: 'var(--text-primary)', 
                            marginBottom: '8px' 
                          }}>
                            Current Lanes ({pairs.length} total)
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                            {pairs.slice(0, 15).map((pair, index) => (
                              <div 
                                key={pair.refId} 
                                style={{ 
                                  fontSize: '12px', 
                                  color: 'var(--text-secondary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                  <span style={{ color: 'var(--primary)', marginRight: '8px', minWidth: '16px' }}>
                                    📍
                                  </span>
                                  <span>
                                    <span style={{ fontWeight: '500' }}>P{index + 1}:</span>
                                    <span style={{ marginLeft: '6px' }}>
                                      {pair.pickup.city}, {pair.pickup.state || pair.pickup.state_or_province} → {pair.delivery.city}, {pair.delivery.state || pair.delivery.state_or_province}
                                    </span>
                                  </span>
                                </div>
                                <span style={{ 
                                  fontSize: '11px', 
                                  fontFamily: 'monospace',
                                  background: 'var(--bg-tertiary)',
                                  color: 'var(--text-secondary)',
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  marginLeft: '8px'
                                }}>
                                  {pair.refId}
                                </span>
                              </div>
                            ))}
                            {pairs.length > 15 && (
                              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                                ... and {pairs.length - 15} more pairs
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* AI talking points (if available) */}
                      {recap && (
                        <>
                          <div style={{ marginBottom: '12px' }}>
                            <h4 style={{ 
                              fontSize: '13px', 
                              fontWeight: '500', 
                              color: 'var(--text-primary)', 
                              marginBottom: '8px' 
                            }}>
                              AI Talking Points
                            </h4>
                            <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {recap.bullets.map((bullet, i) => (
                                <li key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex' }}>
                                  <span style={{ color: 'var(--primary)', marginRight: '8px' }}>•</span>
                                  <span>{bullet}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {recap.risks && recap.risks.length > 0 && (
                            <div style={{ marginBottom: '12px' }}>
                              <h4 style={{ 
                                fontSize: '13px', 
                                fontWeight: '500', 
                                color: 'var(--text-primary)', 
                                marginBottom: '8px' 
                              }}>
                                Risk Factors
                              </h4>
                              <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {recap.risks.map((risk, i) => (
                                  <li key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex' }}>
                                    <span style={{ color: 'var(--warning)', marginRight: '8px' }}>•</span>
                                    <span>{risk}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {recap.price_hint && (
                            <div style={{ 
                              marginTop: '12px', 
                              paddingTop: '12px', 
                              borderTop: '1px solid var(--border-default)' 
                            }}>
                              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                Estimated Rate Range
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--danger)' }}>
                                  Low: ${recap.price_hint.low}/mi
                                </span>
                                <span style={{ fontSize: '12px', color: 'var(--success)' }}>
                                  Target: ${recap.price_hint.mid}/mi
                                </span>
                                <span style={{ fontSize: '12px', color: 'var(--primary)' }}>
                                  High: ${recap.price_hint.high}/mi
                                </span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Fallbacks when no data available */}
                      {!recap && (lane.lane_status || lane.status) !== 'current' && lane.comment && (
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {lane.comment}
                        </div>
                      )}
                      
                      {!recap && (lane.lane_status || lane.status) !== 'current' && !lane.comment && (
                        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                          Generate AI insights or use Post Options to see more details
                        </div>
                      )}
                      
                      {(lane.lane_status || lane.status) === 'current' && postedPairs.filter(pair => pair.laneId === lane.id).length === 0 && (
                        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                          Loading posted pairs...
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        <div className="flex gap-3 no-print" style={{ marginTop: '24px' }}>
          <button
            onClick={() => generateCSV('both')}
            className="btn btn-success"
            style={{
              borderRadius: '8px',
              background: 'var(--success)',
              color: 'white',
              fontWeight: '500',
              padding: '8px 16px',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.2s',
              flex: 1
            }}
            onMouseEnter={(e) => e.target.style.background = 'var(--success-hover)'}
            onMouseLeave={(e) => e.target.style.background = 'var(--success)'}
          >
            Generate CSV (Phone + Email)
          </button>
          <button
            onClick={() => generateCSV('email')}
            className="btn btn-primary"
            style={{
              borderRadius: '8px',
              background: 'var(--primary)',
              color: 'white',
              fontWeight: '500',
              padding: '8px 16px',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.2s',
              flex: 1
            }}
            onMouseEnter={(e) => e.target.style.background = 'var(--primary-hover)'}
            onMouseLeave={(e) => e.target.style.background = 'var(--primary)'}
          >
            Generate CSV (Email Only)
          </button>
          <button
            onClick={() => generateCSV('phone')}
            className="btn btn-secondary"
            style={{
              borderRadius: '8px',
              background: 'var(--primary)',
              color: 'white',
              fontWeight: '500',
              padding: '8px 16px',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.2s',
              flex: 1
            }}
            onMouseEnter={(e) => e.target.style.background = 'var(--primary-hover)'}
            onMouseLeave={(e) => e.target.style.background = 'var(--primary)'}
          >
            Generate CSV (Phone Only)
          </button>
        </div>
        </div>{/* End content wrapper */}

        <style jsx global>{`
          .no-print { display: block; }
          .print-header { display: none; }
          .no-screen { display: none; }
          
          @media print {
            html, body { background-color: white; }
            .no-print { display: none !important; }
            .print-header { display: block !important; }
            .no-screen { display: block !important; }
            .print-break-inside-avoid { break-inside: avoid; }
          }
        `}</style>
      </div>
    </>
  );
}
