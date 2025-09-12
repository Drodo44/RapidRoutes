// pages/recap.js
// Updated: Sep 2, 2025 - Fixed dropdown selection and reference ID search
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import Head from 'next/head';
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
  // Get generated pairs for this lane
  const laneGeneratedPairs = postedPairs.filter(pair => pair.laneId === lane.id);
  
  return (
    <article id={`lane-${lane.id}`} className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden transition-all duration-300">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="font-medium text-gray-100">
            {lane.origin_city}, {lane.origin_state} 
            <span className="text-gray-400 mx-2">→</span> 
            {lane.dest_city}, {lane.dest_state}
          </div>
          <div className="flex items-center gap-2">
            {(lane.reference_id || !lane.reference_id) && (
              <div className="text-xs px-2 py-1 rounded font-mono font-bold bg-green-900/60 text-green-200">
                REF #{getDisplayReferenceId(lane)}
              </div>
            )}
            <div className="text-xs px-2 py-1 rounded-full font-medium bg-blue-900/60 text-blue-200">{lane.status}</div>
          </div>
        </div>
        <div className="text-xs text-gray-300 mt-1">
          <span className="inline-block px-2 py-0.5 rounded bg-gray-700 text-xs font-medium">
            {lane.equipment_code} • {lane.length_ft}ft
          </span>
          <span className="ml-2">
            {lane.randomize_weight 
              ? `${lane.weight_min.toLocaleString()}-${lane.weight_max.toLocaleString()} lbs` 
              : `${lane.weight_lbs?.toLocaleString() || '—'} lbs`}
          </span>
          <span className="ml-2">Pickup: {lane.pickup_earliest} → {lane.pickup_latest}</span>
        </div>
        {lane.comment && <div className="text-xs text-gray-300 mt-2 italic">"{lane.comment}"</div>}
      </div>

      {/* Show generated lanes instead of AI talking points */}
      {lane.status === 'posted' && laneGeneratedPairs.length > 0 && (
        <div className="border-t border-gray-700 bg-gray-900 p-4">
          <div className="mb-3">
            <h4 className="text-sm font-medium text-blue-300 mb-2 flex items-center">
              <span className="mr-2">📍</span>
              Generated Postings ({laneGeneratedPairs.length} lanes posted)
            </h4>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {laneGeneratedPairs.map((pair, index) => (
                <div key={pair.id} className="text-xs text-gray-200 flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <span className="text-blue-400 mr-2 min-w-[16px]">
                      {pair.isBase ? '🎯' : '📊'}
                    </span>
                    <span className="flex-1">
                      <span className="font-medium">
                        {pair.isBase ? 'BASE' : `PAIR ${index}`}:
                      </span>
                      <span className="ml-2">
                        {pair.pickup.city}, {pair.pickup.state} → {pair.delivery.city}, {pair.delivery.state}
                      </span>
                    </span>
                  </div>
                  {/* Show reference ID for each pair */}
                  <span className="text-xs font-mono bg-gray-700 px-1.5 py-0.5 rounded ml-2 text-green-300">
                    {pair.isBase ? cleanReferenceId(pair.referenceId) : pair.referenceId}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="text-xs text-gray-400 bg-gray-800 rounded p-2">
            💡 <strong>Tip:</strong> When carriers call about this load, use the dropdown above to quickly find the exact pickup/delivery pair they're asking about.
          </div>
        </div>
      )}

      {/* Legacy AI recap display (only if specifically generated) */}
      {recapData && recapData.bullets && (
        <div className="border-t border-gray-700 bg-gray-900 p-4">
          <div className="mb-3">
            <h4 className="text-sm font-medium text-blue-300 mb-2">AI Talking Points</h4>
            <ul className="space-y-1.5">
              {recapData.bullets.map((bullet, i) => (
                <li key={i} className="text-xs text-gray-200 flex">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {recapData.risks && recapData.risks.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-medium text-amber-300 mb-2">Risk Factors</h4>
              <ul className="space-y-1.5">
                {recapData.risks.map((risk, i) => (
                  <li key={i} className="text-xs text-gray-200 flex">
                    <span className="text-amber-400 mr-2">•</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recapData.price_hint && (
            <div className="rounded bg-gray-800 p-2 text-xs">
              <div className="text-gray-400">Estimated Rate Range</div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-red-300">${recapData.price_hint.low}/mi</span>
                <span className="text-green-300">${recapData.price_hint.mid}/mi</span>
                <span className="text-blue-300">${recapData.price_hint.high}/mi</span>
              </div>
              <div className="mt-1 text-2xs text-gray-500">Based on: {recapData.price_hint.basis}</div>
            </div>
          )}
        </div>
      )}

      {/* Show generate button only for lanes that need AI insights and don't have generated pairs */}
      {!recapData && lane.status !== 'posted' && (
        <div className="border-t border-gray-700 bg-gray-900 p-4 flex items-center justify-center">
          <button 
            onClick={() => onGenerateRecap(lane.id)}
            disabled={isGenerating}
            className="text-xs px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Generate AI Insights'}
          </button>
        </div>
      )}
    </article>
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
  
  useEffect(() => {
    // Load lanes
    supabase
      .from('lanes')
      .select('*')
      .in('status', ['pending', 'posted'])
      .order('created_at', { ascending: false })
      .limit(200)
      .then(async ({ data }) => {
        setLanes(data || []);
        
        // For posted lanes, get their generated pairs for the dropdown
        const postedLanes = (data || []).filter(lane => lane.status === 'posted');
        const allPairs = [];
        
        for (const lane of postedLanes) {
          try {
            const response = await fetch(`/api/getPostedPairs?laneId=${lane.id}`);
            if (response.ok) {
              const pairData = await response.json();
              if (pairData.postedPairs?.length) {
                // Add base lane as first option
                allPairs.push({
                  id: `base-${lane.id}`,
                  laneId: lane.id,
                  isBase: true,
                  display: `${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`,
                  referenceId: lane.reference_id,
                  pickup: { city: lane.origin_city, state: lane.origin_state },
                  delivery: { city: lane.dest_city, state: lane.dest_state }
                });
                
                // Add generated pairs with unique reference IDs
                pairData.postedPairs.forEach((pair, index) => {
                  const pairRefId = generatePairReferenceId(lane.reference_id, index);
                  allPairs.push({
                    id: `pair-${lane.id}-${index}`,
                    laneId: lane.id,
                    isBase: false,
                    display: `${pair.pickup.city}, ${pair.pickup.state} → ${pair.delivery.city}, ${pair.delivery.state}`,
                    referenceId: pairRefId, // Generate unique reference ID for each pair
                    baseReferenceId: lane.reference_id, // Keep original for grouping
                    pickup: pair.pickup,
                    delivery: pair.delivery
                  });
                });
              }
            }
          } catch (error) {
            console.error(`Error loading pairs for lane ${lane.id}:`, error);
          }
        }
        
        setPostedPairs(allPairs);
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
      
      <div className="container mx-auto max-w-7xl px-4 space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-100 mb-2">Active Lane Postings</h1>
          <p className="text-gray-400">Generate AI-powered talking points for client conversations</p>
          
          {/* Add workflow guidance */}
          {lanes.filter(lane => lane.status === 'pending').length > 0 && (
            <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
              <div className="text-sm text-blue-200">
                <strong>💡 Workflow:</strong> Export CSV → Upload to DAT → Mark lanes as "Posted" → Use recap system to match incoming calls
              </div>
            </div>
          )}
          
          {lanes.filter(lane => lane.status === 'posted').length === 0 && lanes.length > 0 && (
            <div className="mt-4 p-3 bg-amber-900/30 border border-amber-700 rounded-lg">
              <div className="text-sm text-amber-200">
                <strong>📋 No Posted Lanes:</strong> Mark your lanes as "Posted" after uploading CSV to DAT to see generated pairs here
              </div>
            </div>
          )}
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center space-x-4">
              <div className="relative w-64">
                <input 
                  type="text" 
                  value={q} 
                  onChange={(e) => {
                    setQ(e.target.value);
                  }}
                  placeholder="Search reference ID, city, state, or equipment"
                  className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <span className="absolute left-3 top-2.5 text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
              </div>
              
              <div className="relative w-80">
                <select 
                  value=""
                  onChange={(e) => {
                    const selectedValue = e.target.value;
                    
                    if (selectedValue) {
                      // Handle both posted pairs and pending lanes
                      let targetLaneId;
                      
                      if (selectedValue.startsWith('pending-')) {
                        // Extract UUID directly (no parseInt for UUIDs)
                        targetLaneId = selectedValue.replace('pending-', '');
                      } else if (selectedValue.includes('-')) {
                        // Extract lane ID from pair ID format: "base-uuid" or "pair-uuid-0"
                        const parts = selectedValue.split('-');
                        // For UUIDs, we need to reconstruct the full UUID
                        if (parts.length >= 6) { // UUID parts split by dashes
                          targetLaneId = parts.slice(1, 6).join('-'); // Skip first part (base/pair), join UUID parts
                        } else {
                          console.error('❌ DROPDOWN ERROR: Invalid UUID format in:', selectedValue);
                          return;
                        }
                      }
                      
                      if (!targetLaneId || targetLaneId.length < 10) {
                        console.error('❌ DROPDOWN ERROR: Failed to extract valid lane ID from:', selectedValue);
                        alert('Error: Could not extract lane ID from selection: ' + selectedValue);
                        return;
                      }
                      
                      // Clear search to show all lanes
                      setQ('');
                      
                      // Find the lane in our data
                      const targetLane = lanes.find(l => l.id === targetLaneId);
                      
                      // Scroll to the lane immediately
                      setTimeout(() => {
                        const elementId = `lane-${targetLaneId}`;
                        const element = document.getElementById(elementId);
                        
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          element.style.border = '3px solid #10B981';
                          element.style.backgroundColor = '#1F2937'; // Keep dark theme
                          element.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.5)';
                          element.style.transition = 'all 0.5s ease';
                          
                          // Show which specific pair was selected
                          const selectedPair = postedPairs.find(pair => pair.id === selectedValue);
                          
                          if (selectedPair) {
                            // Create a notification showing the selected pair
                            const notification = document.createElement('div');
                            notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 max-w-md';
                            notification.innerHTML = `
                              <div class="font-semibold">${selectedPair.isBase ? '🎯 BASE LANE' : '📊 GENERATED PAIR'}:</div>
                              <div class="text-sm">${selectedPair.pickup.city}, ${selectedPair.pickup.state} → ${selectedPair.delivery.city}, ${selectedPair.delivery.state}</div>
                              <div class="text-xs mt-1 opacity-80">REF #${cleanReferenceId(selectedPair.referenceId)}</div>
                            `;
                            document.body.appendChild(notification);
                            
                            setTimeout(() => {
                              if (notification.parentNode) {
                                notification.parentNode.removeChild(notification);
                              }
                            }, 5000);
                          }
                          
                          // Remove highlighting after delay
                          setTimeout(() => { 
                            element.style.border = ''; 
                            element.style.backgroundColor = '';
                            element.style.boxShadow = '';
                          }, 10000);
                        } else {
                          console.error('❌ DROPDOWN ERROR: Element not found:', elementId);
                          alert(`Error: Could not find lane element: ${elementId}. Available lanes: ${Array.from(allLanes).map(el => el.id).join(', ')}`);
                        }
                      }, 100);
                    }
                  }}
                  className="w-full bg-gray-900 border border-gray-600 rounded-md text-gray-200 py-2 px-3 appearance-none text-sm"
                >
                  <option value="">📍 Jump to posted lane/pair...</option>
                  {/* Only show posted lanes with their actual generated pairs */}
                  {lanes.filter(lane => lane.status === 'posted' && postedPairs.some(pair => pair.laneId === lane.id)).map(lane => {
                    const basePair = postedPairs.find(pair => pair.laneId === lane.id && pair.isBase);
                    const generatedPairs = postedPairs.filter(pair => pair.laneId === lane.id && !pair.isBase);
                    
                    return (
                      <optgroup key={lane.id} label={`🏠 ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state} • REF #${cleanReferenceId(lane.reference_id)} • ${generatedPairs.length} pairs`}>
                        {basePair && (
                          <option value={basePair.id} className="font-semibold">
                            🎯 BASE: {basePair.display} • {cleanReferenceId(basePair.referenceId)}
                          </option>
                        )}
                        {generatedPairs.slice(0, 15).map((pair, index) => (
                          <option key={pair.id} value={pair.id}>
                            📊 PAIR {index + 1}: {pair.display} • {pair.referenceId}
                          </option>
                        ))}
                        {generatedPairs.length > 15 && (
                          <option disabled>... and {generatedPairs.length - 15} more pairs</option>
                        )}
                      </optgroup>
                    );
                  })}
                  
                  {/* Show pending lanes for reference */}
                  {lanes.filter(lane => lane.status === 'pending').length > 0 && (
                    <optgroup label="⏳ PENDING LANES (Mark as posted after CSV upload)">
                      {lanes.filter(lane => lane.status === 'pending').slice(0, 10).map((lane) => (
                        <option key={`pending-${lane.id}`} value={`pending-${lane.id}`}>
                          ⏳ {lane.origin_city}, {lane.origin_state} → {lane.dest_city}, {lane.dest_state}
                          {lane.reference_id && ` • REF #${cleanReferenceId(lane.reference_id)}`}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>
            
            <div className="flex items-center">
              <label className="text-sm text-gray-300 mr-2">Sort by:</label>
              <select 
                value={sortOrder} 
                onChange={(e) => setSortOrder(e.target.value)} 
                className="bg-gray-900 border border-gray-600 rounded-md text-gray-200 text-sm py-1.5 px-2"
              >
                <option value="date">Date Added</option>
                <option value="origin">Origin</option>
                <option value="dest">Destination</option>
                <option value="equipment">Equipment</option>
              </select>
            </div>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showAIOnly}
                onChange={(e) => setShowAIOnly(e.target.checked)}
                className="rounded bg-gray-900 border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-300">Show AI recaps only</span>
            </label>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={handleGenerateAllRecaps} 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
            >
              Generate All Recaps
            </button>
            
            <button 
              onClick={openExportView} 
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-md text-sm font-medium"
            >
              Export Recaps
            </button>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(lane => (
            <LaneCard
              key={lane.id}
              lane={lane}
              recapData={recaps[lane.id]}
              onGenerateRecap={handleGenerateRecap}
              isGenerating={generatingIds.has(lane.id)}
              postedPairs={postedPairs}
            />
          ))}
        </div>
        
        {filtered.length === 0 && (
          <div className="text-center py-10">
            <div className="text-gray-400 mb-2">No lanes match your search criteria</div>
            <button 
              onClick={() => { setQ(''); setShowAIOnly(false); }} 
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Clear filters
            </button>
          </div>
        )}
        
        <style jsx>{`
          .text-2xs {
            font-size: 0.65rem;
          }
        `}</style>
      </div>
    </>
  );
}
