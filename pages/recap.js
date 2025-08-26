// pages/recap.js
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import Head from 'next/head';

function cleanReferenceId(refId) {
  if (!refId) return '';
  // Remove Excel text formatting like ="RR12345"
  return String(refId).replace(/^="?|"?$/g, '');
}

function matches(q, l) {
  if (!q) return true;
  const s = q.toLowerCase().trim();
  
  // Check reference ID (partial match, with or without RR prefix)
  const refId = cleanReferenceId(l.reference_id).toLowerCase();
  if (refId && refId.includes(s)) {
    return true;
  }
  
  // Check origin/destination
  const origin = `${l.origin_city}, ${l.origin_state}`.toLowerCase();
  const dest = `${l.dest_city}, ${l.dest_state}`.toLowerCase();
  const equipment = String(l.equipment_code || '').toLowerCase();
  
  return origin.includes(s) || dest.includes(s) || equipment.includes(s);
}

function LaneCard({ lane, recapData, onGenerateRecap, isGenerating }) {
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
            {lane.reference_id && (
              <div className="text-xs px-2 py-1 rounded font-mono font-bold bg-green-900/60 text-green-200">
                REF #{cleanReferenceId(lane.reference_id)}
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

      {recapData && (
        <div className="border-t border-gray-700 bg-gray-900 p-4">
          <div className="mb-3">
            <h4 className="text-sm font-medium text-blue-300 mb-2">Talking Points</h4>
            <ul className="space-y-1.5">
              {recapData.bullets.map((bullet, i) => (
                <li key={i} className="text-xs text-gray-200 flex">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {recapData.risks.length > 0 && (
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

      {!recapData && (
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
  
  useEffect(() => {
    // Load lanes
    supabase
      .from('lanes')
      .select('*')
      .in('status', ['pending', 'posted'])
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => setLanes(data || []));
    
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
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center space-x-4">
              <div className="relative w-64">
                <input 
                  type="text" 
                  value={q} 
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search reference ID, city, state, or equipment"
                  className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <span className="absolute left-3 top-2.5 text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
              </div>
              
              <div className="relative w-64">
                <select 
                  value=""
                  onChange={(e) => {
                    const laneId = parseInt(e.target.value);
                    if (laneId) {
                      // Clear search to show all lanes
                      setQ('');
                      // Scroll to the lane immediately
                      setTimeout(() => {
                        const element = document.getElementById(`lane-${laneId}`);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          element.style.border = '3px solid #3B82F6';
                          element.style.backgroundColor = '#1E3A8A40';
                          element.style.transition = 'all 0.3s ease';
                          setTimeout(() => { 
                            element.style.border = ''; 
                            element.style.backgroundColor = '';
                          }, 8000); // Longer highlight duration
                        }
                      }, 100);
                    }
                  }}
                  className="w-full bg-gray-900 border border-gray-600 rounded-md text-gray-200 py-2 px-3 appearance-none"
                >
                  <option value="">📍 Jump to lane...</option>
                  {crawlData
                    .filter(item => !item.isOriginal) // Show only generated crawl cities
                    .map((item, index) => (
                    <option key={`${item.laneId}-${index}`} value={item.laneId}>
                      {item.displayName} → {item.referenceId}
                    </option>
                  ))}
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
