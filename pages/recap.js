// pages/recap.js
// Enterprise UI Rebuild - Oct 3, 2025
import { useEffect, useMemo, useState } from 'react';
import supabase from '../utils/supabaseClient';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getDisplayReferenceId, matchesReferenceId, cleanReferenceId } from '../lib/referenceIdUtils';

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
  const [expandedPairs, setExpandedPairs] = useState(false);
  const router = useRouter();
  
  // Check if lane has saved city choices
  const hasSavedChoices = lane.has_saved_choices && 
                          lane.saved_origin_cities?.length > 0 && 
                          lane.saved_dest_cities?.length > 0;
  
  const totalPairs = hasSavedChoices 
    ? lane.saved_origin_cities.length * lane.saved_dest_cities.length 
    : 0;
  
  const isPosted = (lane.lane_status || lane.status) === 'posted';
  
  // Generate individual RR# for each city pair
  const generatePairRRs = () => {
    if (!hasSavedChoices) return [];
    
    const baseRefId = getDisplayReferenceId(lane);
    const pairs = [];
    let pairIndex = 0;
    
    for (let originIdx = 0; originIdx < lane.saved_origin_cities.length; originIdx++) {
      for (let destIdx = 0; destIdx < lane.saved_dest_cities.length; destIdx++) {
        const originCity = lane.saved_origin_cities[originIdx];
        const destCity = lane.saved_dest_cities[destIdx];
        const pairRR = generatePairReferenceId(baseRefId, pairIndex);
        
        pairs.push({
          originCity,
          destCity,
          referenceId: pairRR,
          pairNumber: pairIndex + 1
        });
        
        pairIndex++;
      }
    }
    
    return pairs;
  };
  
  const pairRRs = generatePairRRs();
  
  return (
    <div className="card" id={`lane-${lane.id}`}>
      {/* Header with RR# - PROMINENT */}
      <div style={{ 
        background: 'var(--primary-light)', 
        borderBottom: '2px solid var(--primary)',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.5px' }}>
            REFERENCE
          </span>
          <span style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: '16px', 
            fontWeight: 700, 
            color: 'var(--primary)',
            letterSpacing: '1px'
          }}>
            {getDisplayReferenceId(lane)}
          </span>
        </div>
        <span className={`badge badge-${isPosted ? 'posted' : 'active'}`}>
          {isPosted ? 'Posted' : 'Active'}
        </span>
      </div>
      
      {/* Route Header */}
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {lane.origin_city}, {lane.origin_state}
              <span style={{ margin: '0 8px', opacity: 0.4 }}>→</span>
              {lane.dest_city || lane.destination_city}, {lane.dest_state || lane.destination_state}
            </h3>
          </div>
        </div>
      </div>

      {/* Lane specs - compact row */}
      <div className="card-body" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{lane.equipment_code}</span>
          <span>{lane.length_ft}ft</span>
          <span>
            {lane.randomize_weight 
              ? `${lane.weight_min?.toLocaleString() || '—'}-${lane.weight_max?.toLocaleString() || '—'} lbs` 
              : `${lane.weight_lbs?.toLocaleString() || '—'} lbs`}
          </span>
          <span>{lane.pickup_earliest} – {lane.pickup_latest}</span>
        </div>
        {lane.comment && (
          <div style={{ marginTop: '8px', fontSize: '12px', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
            "{lane.comment}"
          </div>
        )}
      </div>

      {/* City Selection Section - Clean Two-Column Layout */}
      {hasSavedChoices && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <div className="card-body">
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 600, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--success)' }}>✓</span>
                <span>Selected Cities</span>
                <span style={{ fontSize: '11px', opacity: 0.5, fontWeight: 400 }}>
                  ({lane.saved_origin_cities.length} × {lane.saved_dest_cities.length} = {totalPairs} pairs)
                </span>
              </h4>
              {isPosted && (
                <span className="badge badge-posted" style={{ fontSize: '11px' }}>
                  Posted to DAT
                </span>
              )}
            </div>
            
            {/* Two-Column City Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Pickup Cities */}
              <div>
                <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', color: 'var(--text-secondary)' }}>
                  Pickup Locations ({lane.saved_origin_cities.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {lane.saved_origin_cities.map((city, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        padding: '10px 12px', 
                        background: 'var(--bg-secondary)', 
                        border: '1px solid var(--border)', 
                        borderRadius: 'var(--radius)',
                        fontSize: '12px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                        {city.city}, {city.state}
                      </div>
                      {(city.kma_code || city.kma_name) && (
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '3px' }}>
                          {city.kma_code || city.kma_name}{city.miles && ` • ${Math.round(city.miles)} mi`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Delivery Cities */}
              <div>
                <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', color: 'var(--text-secondary)' }}>
                  Delivery Locations ({lane.saved_dest_cities.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {lane.saved_dest_cities.map((city, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        padding: '10px 12px', 
                        background: 'var(--bg-secondary)', 
                        border: '1px solid var(--border)', 
                        borderRadius: 'var(--radius)',
                        fontSize: '12px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                        {city.city}, {city.state}
                      </div>
                      {(city.kma_code || city.kma_name) && (
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '3px' }}>
                          {city.kma_code || city.kma_name}{city.miles && ` • ${Math.round(city.miles)} mi`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Expandable All Pairs Section */}
            <div style={{ marginTop: '16px' }}>
              <button
                onClick={() => setExpandedPairs(!expandedPairs)}
                className="btn btn-secondary"
                style={{ 
                  width: '100%', 
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span>{expandedPairs ? '▼' : '▶'}</span>
                <span>View All {totalPairs} Pairs with Reference IDs</span>
              </button>
              
              {expandedPairs && (
                <div style={{ 
                  marginTop: '12px', 
                  maxHeight: '400px', 
                  overflowY: 'auto', 
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {lane.saved_origin_cities.flatMap((originCity, originIdx) => 
                      lane.saved_dest_cities.map((destCity, destIdx) => {
                        const pairIndex = originIdx * lane.saved_dest_cities.length + destIdx;
                        const pairRefId = generatePairReferenceId(lane.reference_id, pairIndex);
                        
                        return (
                          <div 
                            key={`${originIdx}-${destIdx}`} 
                            style={{ 
                              padding: '12px', 
                              background: 'var(--surface)', 
                              border: '1px solid var(--border)', 
                              borderRadius: 'var(--radius)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                                PAIR #{pairIndex + 1}
                              </span>
                              <span className="badge" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600 }}>
                                {pairRefId}
                              </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center', fontSize: '12px' }}>
                              <div>
                                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                  {originCity.city}, {originCity.state}
                                </div>
                                {(originCity.kma_code || originCity.kma_name) && (
                                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                    {originCity.kma_code || originCity.kma_name}
                                  </div>
                                )}
                              </div>
                              <span style={{ opacity: 0.3, fontSize: '14px' }}>→</span>
                              <div>
                                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                  {destCity.city}, {destCity.state}
                                </div>
                                {(destCity.kma_code || destCity.kma_name) && (
                                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                    {destCity.kma_code || destCity.kma_name}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                    💡 Use these reference IDs when posting individual loads to DAT
                  </div>
                </div>
              )}
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
      {!recapData && (lane.lane_status || lane.status) !== 'posted' && (
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
  const [crawlData, setCrawlData] = useState([]);
  const [recaps, setRecaps] = useState({});
  const [generatingIds, setGeneratingIds] = useState(new Set());
  const [showAIOnly, setShowAIOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState('date');
  const [postedPairs, setPostedPairs] = useState([]); // Store all generated pairs for dropdown
  const [selectedLaneId, setSelectedLaneId] = useState(''); // For dropdown snap-to functionality
  
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
    // Load lanes with saved city choices (active) and posted lanes
    supabase
      .from('lanes')
      .select('*')
      .in('lane_status', ['active', 'posted'])
      .order('created_at', { ascending: false })
      .limit(200)
      .then(async ({ data }) => {
        setLanes(data || []);
        
        // For active lanes, get their saved city choices
        const activeLanes = (data || []).filter(lane => (lane.lane_status || lane.status) === 'active');
        const postedLanes = (data || []).filter(lane => (lane.lane_status || lane.status) === 'posted');
        const allPairs = [];
        
        // Load saved city choices for active AND posted lanes
        const allLanesWithChoices = [...activeLanes, ...postedLanes];
        
        for (const lane of allLanesWithChoices) {
          try {
            const { data: cityChoices, error } = await supabase
              .from('lane_city_choices')
              .select('*')
              .eq('lane_id', lane.id)
              .order('created_at', { ascending: false });
            
            if (!error && cityChoices?.length > 0) {
              const choice = cityChoices[0]; // Get the latest saved choice
              
              // Store the saved selection info for this lane (don't expand into pairs yet)
              const originCities = choice.origin_chosen_cities || [];
              const destCities = choice.dest_chosen_cities || [];
              
              // Just store the lane with its saved cities - we'll display them grouped
              lane.saved_origin_cities = originCities;
              lane.saved_dest_cities = destCities;
              lane.has_saved_choices = true;
            }
          } catch (error) {
            console.error(`Error loading city choices for lane ${lane.id}:`, error);
          }
        }
        
        // No longer need posted pairs array
        setPostedPairs([]);
      });
    
    // Load crawl cities for dropdown
    fetch('/api/lanes/crawl-cities')
      .then(res => res.json())
      .then(data => {
        if (data.crawlData) {
          setCrawlData(data.crawlData);
        }
      })
      .catch(error => console.error('Error loading crawl cities:', error));
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

  return (
    <>
      <Head>
        <title>Recap | RapidRoutes</title>
      </Head>
      
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0, marginBottom: '4px', color: 'var(--text-primary)' }}>
            Active Lane Postings
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            View your selected city combinations and reference IDs for DAT posting
          </p>
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
                    {getDisplayReferenceId(lane)} • {lane.origin_city}, {lane.origin_state} → {lane.dest_city || lane.destination_city}, {lane.dest_state || lane.destination_state}
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
              <span>Active:</span>
              <strong style={{ marginLeft: '4px', color: 'var(--success)' }}>
                {filtered.filter(l => (l.lane_status || l.status) === 'active').length}
              </strong>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span>Posted:</span>
              <strong style={{ marginLeft: '4px', color: 'var(--primary)' }}>
                {filtered.filter(l => (l.lane_status || l.status) === 'posted').length}
              </strong>
            </div>
          </div>
        </div>
        
        {/* Lane Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.length === 0 ? (
            <div style={{ 
              backgroundColor: 'var(--surface)', 
              border: '1px solid var(--surface-border)',
              borderRadius: '6px',
              padding: '48px', 
              textAlign: 'center' 
            }}>
              <div style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.2 }}>📭</div>
              <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-primary)' }}>No lanes found</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {q ? 'Try adjusting your search' : 'Create your first lane to get started'}
              </div>
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
