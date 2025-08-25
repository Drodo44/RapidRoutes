// pages/recap-export.js
// Print-friendly HTML export for Recap. Accepts ?ids=<comma-separated UUIDs>.
// Fetches lanes client-side and renders compact, printable cards with AI insights.

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import Head from 'next/head';

function cleanReferenceId(refId) {
  if (!refId) return '';
  // Remove Excel text formatting like ="RR12345"
  return String(refId).replace(/^="?|"?$/g, '');
}

export default function RecapExport() {
  const [lanes, setLanes] = useState([]);
  const [crawlData, setCrawlData] = useState([]);
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
        // fallback to active lanes
        const { data } = await supabase
          .from('lanes')
          .select('*')
          .in('status', ['pending', 'posted'])
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
      }
      
      // Load crawl cities for dropdown
      try {
        const response = await fetch('/api/lanes/crawl-cities');
        const data = await response.json();
        if (data.crawlData) {
          setCrawlData(data.crawlData);
        }
      } catch (error) {
        console.error('Error loading crawl cities:', error);
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

  // Search functionality
  const matches = (lane, query) => {
    if (!query) return true;
    
    const q = query.toLowerCase().trim();
    
    // Check reference ID (format: RR12345)
    const refId = cleanReferenceId(lane.reference_id) || `RR${String(lane.id).slice(-5)}`;
    if (refId.toLowerCase().includes(q)) return true;
    
    // Check origin and destination
    const origin = `${lane.origin_city}, ${lane.origin_state}`.toLowerCase();
    const dest = `${lane.dest_city}, ${lane.dest_state}`.toLowerCase();
    
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

  return (
    <>
      <Head>
        <title>Recap Export | RapidRoutes</title>
      </Head>
      
      <div className="p-6 bg-white text-gray-800 min-h-screen">
        <div className="no-print mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">RapidRoutes – Shipper Recap</h1>
            <p className="text-sm text-gray-500">Generated on {formatDate()}</p>
          </div>
          
          <div className="flex gap-3 items-center">
            {/* Search Bar */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search reference ID, city, equipment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-64"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-2 text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Lane Dropdown */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  scrollToLane(e.target.value);
                  e.target.value = '';
                }
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm max-w-64"
            >
              <option value="">Jump to lane...</option>
              {crawlData
                .filter(item => !item.isOriginal) // Show only generated crawl cities
                .map((item, index) => (
                <option key={`${item.laneId}-${index}`} value={item.laneId}>
                  {item.displayName} → {cleanReferenceId(item.referenceId)}
                </option>
              ))}
            </select>

            {aiLoading && <div className="text-sm text-gray-500">Loading AI insights...</div>}
            <button 
              onClick={printNow} 
              className="rounded-lg bg-blue-600 text-white font-medium px-4 py-2 hover:bg-blue-700"
            >
              Print Document
            </button>
          </div>
        </div>

        {loading && <div className="text-sm text-gray-400">Loading lanes...</div>}

        {/* Search Results Info */}
        {!loading && searchQuery && (
          <div className="no-print mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-700">
              Found {filteredLanes.length} lane{filteredLanes.length !== 1 ? 's' : ''} matching "{searchQuery}"
            </div>
          </div>
        )}

        <div className="print-header no-screen">
          <div className="flex items-center justify-between border-b border-gray-300 pb-4 mb-6">
            <div>
              <h1 className="text-xl font-bold">RapidRoutes Shipper Recap</h1>
              <p className="text-sm text-gray-500">Generated on {formatDate()}</p>
            </div>
            <div className="text-right">
              <div className="font-bold">RapidRoutes Logistics</div>
              <div className="text-sm text-gray-500">Enterprise Freight Solutions</div>
            </div>
          </div>
        </div>

        {!loading && groups.map(([equip, arr]) => (
          <section key={equip} className="mb-8">
            <h2 className="text-lg font-semibold border-b border-gray-200 pb-1 mb-3">
              {equip === 'V' ? 'Dry Van' : 
               equip === 'R' ? 'Reefer' : 
               equip === 'F' || equip === 'FD' ? 'Flatbed' : 
               equip} Lanes
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {arr.map((lane) => {
                const recap = recaps[lane.id];
                const refId = `RR${String(lane.id).slice(-5)}`;
                return (
                  <article 
                    key={lane.id} 
                    id={`lane-${lane.id}`}
                    className="rounded-lg border border-gray-300 overflow-hidden print-break-inside-avoid"
                  >
                    <div className="bg-gray-100 p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-lg">
                          {lane.origin_city}, {lane.origin_state} 
                          <span className="text-gray-500 mx-2">→</span> 
                          {lane.dest_city}, {lane.dest_state}
                        </div>
                        <div className="text-sm font-mono text-gray-600 bg-white px-2 py-1 rounded">
                          {refId}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        <span className="font-medium">
                          {lane.equipment_code === 'V' ? 'Dry Van' : 
                           lane.equipment_code === 'R' ? 'Reefer' : 
                           lane.equipment_code === 'F' || lane.equipment_code === 'FD' ? 'Flatbed' : 
                           lane.equipment_code} • {lane.length_ft}ft
                        </span>
                        <span className="ml-2">
                          {lane.randomize_weight 
                            ? `${lane.weight_min.toLocaleString()}-${lane.weight_max.toLocaleString()} lbs` 
                            : `${lane.weight_lbs?.toLocaleString() || '—'} lbs`}
                        </span>
                        <span className="ml-2">Pickup: {lane.pickup_earliest} → {lane.pickup_latest}</span>
                      </div>
                    </div>
                    
                    <div className="p-3">
                      {recap && (
                        <>
                          <div className="mb-3">
                            <h4 className="text-sm font-medium text-gray-700 mb-1">Talking Points</h4>
                            <ul className="space-y-1">
                              {recap.bullets.map((bullet, i) => (
                                <li key={i} className="text-sm text-gray-600 flex">
                                  <span className="text-blue-600 mr-2">•</span>
                                  <span>{bullet}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {recap.risks.length > 0 && (
                            <div className="mb-3">
                              <h4 className="text-sm font-medium text-gray-700 mb-1">Risk Factors</h4>
                              <ul className="space-y-1">
                                {recap.risks.map((risk, i) => (
                                  <li key={i} className="text-sm text-gray-600 flex">
                                    <span className="text-amber-600 mr-2">•</span>
                                    <span>{risk}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {recap.price_hint && (
                            <div className="mt-3 pt-2 border-t border-gray-200">
                              <div className="text-xs text-gray-500">Estimated Rate Range</div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-red-600">Low: ${recap.price_hint.low}/mi</span>
                                <span className="text-xs text-green-600">Target: ${recap.price_hint.mid}/mi</span>
                                <span className="text-xs text-blue-600">High: ${recap.price_hint.high}/mi</span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      
                      {!recap && lane.comment && (
                        <div className="text-sm text-gray-600">{lane.comment}</div>
                      )}
                      
                      {!recap && !lane.comment && (
                        <div className="text-sm text-gray-500 italic">No additional information available</div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}

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
