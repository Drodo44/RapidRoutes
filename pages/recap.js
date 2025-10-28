// pages/recap.js
// Enterprise UI Rebuild - Oct 3, 2025
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getDisplayReferenceId, matchesReferenceId, cleanReferenceId } from '../lib/referenceIdUtils';
// Avoid importing server-only services on the client; use API instead
import RecapDynamic from '../components/RecapDynamic.jsx';
import { fetchLaneRecords as fetchLaneRecordsBrowser } from '@/services/browserLaneService';

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

function matches(q, l) {
  if (!q) return true;
  
  // Check reference ID using unified logic
  if (matchesReferenceId(q, l)) {
    return true;
  }
  
  // Check origin/destination cities and states
  const s = q.toLowerCase().trim();
  const origin = `${l.origin_city || ''}, ${l.origin_state || ''}`.toLowerCase();
  const dest = `${l.dest_city || ''}, ${l.dest_state || ''}`.toLowerCase();
  const equipment = String(l.equipment_code || '').toLowerCase();
  const comment = String(l.comment || '').toLowerCase();
  
  const cityStateMatch = origin.includes(s) || 
         dest.includes(s) || 
         equipment.includes(s) ||
         comment.includes(s) ||
         (l.origin_city || '').toLowerCase().includes(s) ||
         (l.origin_state || '').toLowerCase().includes(s) ||
         (l.dest_city || '').toLowerCase().includes(s) ||
         (l.dest_state || '').toLowerCase().includes(s);
  
  return cityStateMatch;
}

function LaneCard({ lane, recapData, onGenerateRecap, isGenerating, postedPairs = [] }) {
  const router = useRouter();
  
  // Check if lane has saved city choices (check if arrays exist and have data)
  const hasSavedChoices = lane.saved_origin_cities?.length > 0 && 
                          lane.saved_dest_cities?.length > 0;
  
  // One-to-one pairing: number of pairs is the minimum of the two arrays
  const totalPairs = hasSavedChoices 
    ? Math.min(lane.saved_origin_cities.length, lane.saved_dest_cities.length)
    : 0;
  
  const isCurrent = (lane.lane_status || lane.status) === 'current';
  
  // Generate individual RR# for each city pair (one-to-one pairing)
  const generatePairRRs = () => {
    if (!hasSavedChoices) return [];
    
    const baseRefId = getDisplayReferenceId(lane);
    const pairs = [];
    
    // One-to-one pairing: pickup[0] with delivery[0], pickup[1] with delivery[1], etc.
    const numPairs = Math.min(lane.saved_origin_cities.length, lane.saved_dest_cities.length);
    
    for (let i = 0; i < numPairs; i++) {
      const originCity = lane.saved_origin_cities[i];
      const destCity = lane.saved_dest_cities[i];
      const pairRR = generatePairReferenceId(baseRefId, i);
      
      pairs.push({
        originCity,
        destCity,
        referenceId: pairRR,
        pairNumber: i + 1
      });
    }
    
    return pairs;
  };
  
  const pairRRs = generatePairRRs();
  
  return (
    <div className="card" id={`lane-${lane.id}`} style={{ overflow: 'hidden' }}>
      {/* Compact Header: Main Lane Information */}
      <div className="card-header" style={{ padding: '16px', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            {/* RR# Badge */}
            <div style={{ marginBottom: '8px' }}>
              <span style={{ 
                fontFamily: 'Monaco, Consolas, monospace', 
                fontSize: '16px', 
                fontWeight: 700, 
                color: 'var(--primary)',
                background: 'var(--primary-light)',
                padding: '6px 12px',
                borderRadius: '6px',
                display: 'inline-block'
              }}>
                {getDisplayReferenceId(lane)}
              </span>
              <span className={`badge badge-${isCurrent ? 'current' : 'archive'}`} style={{ fontSize: '11px', marginLeft: '8px' }}>
                {isCurrent ? 'Current' : 'Archive'}
              </span>
            </div>
            
            {/* Main Lane Route */}
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              {lane.origin_city}, {lane.origin_state} → {lane.destination_city || lane.dest_city}, {lane.destination_state || lane.dest_state}
            </div>
            
            {/* Lane Details */}
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span><strong>Equipment:</strong> {lane.equipment_code || '?'}</span>
              <span><strong>Length:</strong> {lane.length_ft || '?'}ft</span>
              <span><strong>Pickup:</strong> {lane.pickup_earliest || '?'}</span>
              {lane.weight_lbs && <span><strong>Weight:</strong> {lane.weight_lbs.toLocaleString()} lbs</span>}
            </div>
            
            {lane.comment && (
              <div style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-tertiary)', marginTop: '8px', paddingLeft: '12px', borderLeft: '3px solid var(--border)' }}>
                "{lane.comment}"
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected Crawl Cities - Compact List */}
      {hasSavedChoices && (
        <div className="card-body" style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
          <h4 style={{ 
            fontSize: '14px', 
            fontWeight: 600, 
            margin: '0 0 12px 0', 
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ color: 'var(--success)' }}>✓</span>
            <span>Selected Posting Cities</span>
            <span style={{ fontSize: '12px', opacity: 0.6, fontWeight: 400 }}>
              ({totalPairs} pairs • {totalPairs * 2} postings with email + phone)
            </span>
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Pickup Cities */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Pickup Cities ({lane.saved_origin_cities.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {lane.saved_origin_cities.map((city, idx) => (
                  <div 
                    key={idx}
                    style={{ 
                      fontSize: '13px', 
                      padding: '6px 10px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: '4px',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {city.city}, {city.state}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      {city.kma_code} • {city.distance ? `${Math.round(city.distance)} mi from origin` : 'Unknown distance'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Delivery Cities */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Delivery Cities ({lane.saved_dest_cities.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {lane.saved_dest_cities.map((city, idx) => (
                  <div 
                    key={idx}
                    style={{ 
                      fontSize: '13px', 
                      padding: '6px 10px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: '4px',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {city.city}, {city.state}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      {city.kma_code} • {city.distance ? `${Math.round(city.distance)} mi from destination` : 'Unknown distance'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legacy AI recap display (only if specifically generated) */}
      {recapData && recapData.bullets && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <div className="card-body">
            <div style={{ marginBottom: '12px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>AI Talking Points</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {recapData.bullets.map((bullet, i) => (
                  <li key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                    <span style={{ color: 'var(--primary)' }}>•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>

            {recapData.risks && recapData.risks.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--warning)', marginBottom: '8px' }}>Risk Factors</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {recapData.risks.map((risk, i) => (
                    <li key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                      <span style={{ color: 'var(--warning)' }}>•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {recapData.price_hint && (
              <div style={{ padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '12px' }}>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>Estimated Rate Range</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--danger)' }}>${recapData.price_hint.low}/mi</span>
                  <span style={{ color: 'var(--success)' }}>${recapData.price_hint.mid}/mi</span>
                  <span style={{ color: 'var(--primary)' }}>${recapData.price_hint.high}/mi</span>
                </div>
                <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-tertiary)' }}>Based on: {recapData.price_hint.basis}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Show generate button only for lanes that need AI insights */}
      {!recapData && (lane.lane_status || lane.status) !== 'archive' && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <div className="card-body" style={{ display: 'flex', justifyContent: 'center' }}>
            <button 
              onClick={() => onGenerateRecap(lane.id)}
              disabled={isGenerating}
              className="btn btn-secondary"
              style={{ fontSize: '12px' }}
            >
              {isGenerating ? 'Generating...' : 'Generate AI Insights'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RecapPage() {
  const [q, setQ] = useState('');
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [crawlData, setCrawlData] = useState([]);
  const [recaps, setRecaps] = useState({});
  const [generatingIds, setGeneratingIds] = useState(new Set());
  const [showAIOnly, setShowAIOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState('date');
  const [postedPairs, setPostedPairs] = useState([]); // Store all generated pairs for dropdown
  const [selectedLaneId, setSelectedLaneId] = useState(''); // For dropdown snap-to functionality
  const [isGeneratingCSV, setIsGeneratingCSV] = useState(false);
  const [viewMode, setViewMode] = useState('dynamic'); // 'classic' or 'dynamic'
  
  // Generate CSV for all visible lanes (active or posted)
  async function generateCSV() {
    try {
      setIsGeneratingCSV(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert('Authentication required. Please refresh the page and try again.');
        return;
      }

      // Get filtered lanes that have saved choices (check arrays directly)
      const lanesWithChoices = filtered.filter(l => 
        l.saved_origin_cities?.length > 0 && 
        l.saved_dest_cities?.length > 0
      );
      
      if (lanesWithChoices.length === 0) {
        alert('No lanes with saved city choices to export. Please select city choices on the lanes page first.');
        return;
      }

      const totalPairs = lanesWithChoices.reduce((sum, lane) => 
        sum + Math.min(lane.saved_origin_cities.length, lane.saved_dest_cities.length), 0
      );

      const totalPostings = totalPairs * 2; // Each pair × 2 contact methods

      if (!confirm(`Generate DAT CSV for ${lanesWithChoices.length} lane(s) with ${totalPairs} pairs (${totalPostings} total postings with email + phone)?`)) {
        return;
      }

      // Call the new CSV export API for saved city selections
      const response = await fetch('/api/exportSavedCitiesCsv', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate CSV');
      }

      // Download the CSV file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      link.download = `DAT_Export_${dateStr}.csv`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert(`CSV generated successfully! File contains ${lanesWithChoices.length} lane(s) with ${totalPairs} city pairs and RR# tracking numbers.`);
      
    } catch (error) {
      console.error('CSV Generation Error:', error);
      alert(`Failed to generate CSV: ${error.message}`);
    } finally {
      setIsGeneratingCSV(false);
    }
  }
  
  // Scroll to lane function
  const scrollToLane = (laneId) => {
    const element = document.getElementById(`lane-${laneId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add highlight effect
      element.style.transition = 'box-shadow 0.3s ease';
      element.style.boxShadow = '0 0 0 4px var(--primary-light)';
      setTimeout(() => {
        element.style.boxShadow = '';
      }, 2000);
    }
  };
  
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const records = await fetchLaneRecordsBrowser({ status: 'current', limit: 300, onlyWithSavedCities: true });
        if (cancelled) return;
        // Filter to lanes with saved city choices (check arrays directly)
        const lanesWithChoices = (records || []).filter(
          (l) => Array.isArray(l.saved_origin_cities) && l.saved_origin_cities.length > 0 && 
                 Array.isArray(l.saved_dest_cities) && l.saved_dest_cities.length > 0
        );
        setLanes(lanesWithChoices);
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading lanes:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    
    // Load crawl cities for dropdown
    fetch('/api/lanes/crawl-cities')
      .then(res => res.json())
      .then(data => {
        if (data.crawlData) {
          setCrawlData(data.crawlData);
        }
      })
      .catch(error => console.error('Error loading crawl cities:', error));

    return () => {
      cancelled = true;
    };
  }, []);
  
  const filtered = useMemo(() => {
    let result = (lanes || []).filter(l => matches(q, l));
    
    // Apply AI-only filter if enabled
    if (showAIOnly) {
      result = result.filter(lane => recaps[lane.id]);
    }
    
    // Apply sorting
    if (sortOrder === 'origin') {
      result.sort((a, b) => `${a.origin_city}, ${a.origin_state}`.localeCompare(`${b.origin_city}, ${b.origin_state}`));
    } else if (sortOrder === 'dest') {
      result.sort((a, b) => `${a.dest_city}, ${a.dest_state}`.localeCompare(`${b.dest_city}, ${b.dest_state}`));
    } else if (sortOrder === 'equipment') {
      result.sort((a, b) => a.equipment_code.localeCompare(b.equipment_code));
    }
    // date sorting is default (no need to sort again)
    
    return result;
  }, [lanes, q, recaps, showAIOnly, sortOrder]);

  const handleGenerateRecap = async (laneId) => {
    setGeneratingIds(prev => new Set([...prev, laneId]));
    
    try {
      const response = await fetch('/api/generateRecap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          laneIds: [laneId]
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to generate recap`);
      }
      
      const data = await response.json();
      
      if (data.results?.length) {
        setRecaps(prev => ({
          ...prev,
          [laneId]: data.results[0]
        }));
      } else {
        throw new Error('No recap data returned');
      }
    } catch (error) {
      console.error('Error generating recap:', error);
      alert(`Failed to generate AI insights: ${error.message}`);
    } finally {
      setGeneratingIds(prev => {
        const updated = new Set([...prev]);
        updated.delete(laneId);
        return updated;
      });
    }
  };

  function openExportView() {
    const ids = filtered.map(l => l.id).join(',');
    window.open(`/recap-export?ids=${encodeURIComponent(ids)}`, '_blank');
  }
  
  function handleGenerateAllRecaps() {
    // Generate for all visible lanes that don't already have recaps
    const needsGeneration = filtered.filter(lane => !recaps[lane.id]);
    
    // Process in batches of 3 to avoid overwhelming the server
    const processBatch = async (index = 0, batchSize = 3) => {
      const batch = needsGeneration.slice(index, index + batchSize);
      if (batch.length === 0) return;
      
      const batchIds = batch.map(lane => lane.id);
      setGeneratingIds(prev => new Set([...prev, ...batchIds]));
      
      try {
        const response = await fetch('/api/ai/recap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            laneIds: batchIds
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to generate recaps');
        }
        
        const data = await response.json();
        
        if (data.results?.length) {
          setRecaps(prev => {
            const updated = { ...prev };
            data.results.forEach(result => {
              updated[result.laneId] = result;
            });
            return updated;
          });
        }
      } catch (error) {
        console.error('Error generating recaps:', error);
      } finally {
        setGeneratingIds(prev => {
          const updated = new Set([...prev]);
          batchIds.forEach(id => updated.delete(id));
          return updated;
        });
        
        // Process next batch
        if (index + batchSize < needsGeneration.length) {
          setTimeout(() => processBatch(index + batchSize, batchSize), 1000);
        }
      }
    };
    
    processBatch();
  }

  // Refresh function for dynamic recap
  const handleRefresh = () => {
    setLoading(true);
    fetchLaneRecordsBrowser({ status: 'current', limit: 300, onlyWithSavedCities: true })
      .then((records) => {
        const lanesWithChoices = (records || []).filter(
          (l) => l?.has_saved_choices && Array.isArray(l.saved_origin_cities) && l.saved_origin_cities.length > 0 && Array.isArray(l.saved_dest_cities) && l.saved_dest_cities.length > 0
        );
        setLanes(lanesWithChoices);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  };

  // If Dynamic mode is selected, render the new component
  if (viewMode === 'dynamic') {
    return (
      <>
        <Head>
          <title>Recap 2.0 | RapidRoutes</title>
        </Head>
        
        <div style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 1000 }}>
          <button
            onClick={() => setViewMode('classic')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '2px solid var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Switch to Classic View
          </button>
        </div>
        
        <RecapDynamic lanes={lanes} onRefresh={handleRefresh} />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Recap | RapidRoutes</title>
      </Head>
      
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0, marginBottom: '4px', color: 'var(--text-primary)' }}>
              Active Lane Postings
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              View your selected city combinations and reference IDs for DAT posting
            </p>
          </div>
          <button
            onClick={() => setViewMode('dynamic')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '2px solid #06b6d4',
              backgroundColor: '#0891b2',
              color: 'white',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            ✨ Try Recap 2.0
          </button>
        </div>
        
        {/* Search and Filter Bar */}
        <div style={{ 
          backgroundColor: 'var(--surface)', 
          border: '1px solid var(--surface-border)',
          borderRadius: '6px',
          marginBottom: '16px',
          padding: '12px'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
              {/* Lane Jump Dropdown */}
              <select 
                value={selectedLaneId}
                onChange={(e) => {
                  setSelectedLaneId(e.target.value);
                  if (e.target.value) {
                    scrollToLane(e.target.value);
                  }
                }}
                className="form-input"
                style={{ width: 'auto', minWidth: '200px', fontSize: '12px', padding: '6px 8px' }}
              >
                <option value="">Jump to Lane...</option>
                {filtered.map(lane => (
                  <option key={lane.id} value={lane.id}>
                    {getDisplayReferenceId(lane)} • {lane.origin_city || '?'}, {lane.origin_state || '?'} → {lane.dest_city || lane.destination_city || '?'}, {lane.dest_state || lane.destination_state || '?'}
                  </option>
                ))}
              </select>
              
              {/* Search Input */}
              <div style={{ position: 'relative', flex: 1, maxWidth: '250px' }}>
                <input 
                  type="text" 
                  value={q} 
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search RR#, city..."
                  className="form-input"
                  style={{ paddingLeft: '32px', width: '100%', fontSize: '12px', padding: '6px 6px 6px 32px' }}
                />
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                </span>
              </div>
              
              {/* Sort Dropdown */}
              <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="form-input"
                style={{ width: 'auto', minWidth: '130px', fontSize: '12px', padding: '6px 8px' }}
              >
                <option value="date">Sort: Newest</option>
                <option value="origin">Sort: Origin</option>
                <option value="dest">Sort: Destination</option>
                <option value="equipment">Sort: Equipment</option>
              </select>
            </div>
            
            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={generateCSV}
                className="btn btn-success"
                style={{ fontSize: '12px', padding: '6px 12px' }}
                disabled={filtered.length === 0 || isGeneratingCSV}
              >
                {isGeneratingCSV ? '⏳ Generating...' : '📊 Export CSV'}
              </button>
              <button 
                onClick={openExportView}
                className="btn btn-primary"
                style={{ fontSize: '12px', padding: '6px 12px' }}
                disabled={filtered.length === 0}
              >
                📄 Export Recap
              </button>
            </div>
          </div>
          
          {/* Stats Row */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--surface-border)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span>Total Lanes:</span>
              <strong style={{ marginLeft: '4px', color: 'var(--text-primary)' }}>{filtered.length}</strong>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span>Current:</span>
              <strong style={{ marginLeft: '4px', color: 'var(--success)' }}>
                {filtered.filter(l => (l.lane_status || l.status) === 'current').length}
              </strong>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span>Archive:</span>
              <strong style={{ marginLeft: '4px', color: 'var(--muted)' }}>
                {filtered.filter(l => (l.lane_status || l.status) === 'archive').length}
              </strong>
            </div>
          </div>
        </div>
        
        {/* Lane Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.length === 0 ? (
            <div style={{ 
              backgroundColor: 'var(--surface)', 
              border: '2px solid var(--border)',
              borderRadius: '8px',
              padding: '64px 48px', 
              textAlign: 'center' 
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>�</div>
              <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
                No lanes ready for recap
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
                {q ? 'No lanes match your search criteria.' : 'To see lanes here, you need to select city pairs first.'}
              </div>
              {!q && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '24px', maxWidth: '500px', margin: '0 auto', textAlign: 'left' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>Quick Start Guide:</div>
                  <ol style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '2', paddingLeft: '20px', margin: 0 }}>
                    <li>Go to <a href="/lanes" className="text-blue-400 hover:text-blue-300">Lanes page</a></li>
                    <li>Create a new lane (origin → destination)</li>
                    <li>Click "🎯 Post Options" button</li>
                    <li>Click "Generate All Pairings"</li>
                    <li>Check the city pairs you want to use</li>
                    <li>Click "💾 Save Cities" button</li>
                    <li>Come back here to see your recap!</li>
                  </ol>
                  <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                    <a 
                      href="/lanes" 
                      className="btn btn-primary"
                      style={{ display: 'inline-block', fontSize: '14px' }}
                    >
                      Go to Lanes Page →
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            filtered.map((lane) => (
              <LaneCard 
                key={lane.id}
                lane={lane}
                recapData={recaps[lane.id]}
                onGenerateRecap={handleGenerateRecap}
                isGenerating={generatingIds.has(lane.id)}
                postedPairs={postedPairs}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
