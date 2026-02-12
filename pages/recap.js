// pages/recap.js
// Enterprise UI Rebuild - Oct 3, 2025
import { useEffect, useMemo, useState } from 'react';
import supabase from '../utils/supabaseClient';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getDisplayReferenceId, matchesReferenceId, cleanReferenceId } from '../lib/referenceIdUtils';
import RecapDynamic from '../components/RecapDynamic.jsx';
import { fetchLaneRecords as fetchLaneRecordsBrowser } from '@/services/browserLaneService';
import LogContactModal from '../components/LogContactModal.jsx';
import EmailTemplateModal from '../components/EmailTemplateModal.jsx';
import DashboardLayout from '../components/DashboardLayout.jsx';
import CSVExportModal from '../components/recap/CSVExportModal.jsx';
import IntelligentLaneCard from '../components/recap/IntelligentLaneCard.jsx';
import AppBackground from '../components/ui/AppBackground';
import {
  markLaneGaveBack,
  boostLaneRate,
  addCarrierOffer,
  toggleLanePriority,
} from '../lib/laneIntelligenceService';

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

function getSavedCityState(lane) {
  const savedOriginCities = Array.isArray(lane?.saved_origin_cities)
    ? lane.saved_origin_cities
    : Array.isArray(lane?.saved_origins)
      ? lane.saved_origins
      : Array.isArray(lane?.origin_cities)
        ? lane.origin_cities
        : [];

  const savedDestCities = Array.isArray(lane?.saved_dest_cities)
    ? lane.saved_dest_cities
    : Array.isArray(lane?.saved_dests)
      ? lane.saved_dests
      : Array.isArray(lane?.dest_cities)
        ? lane.dest_cities
        : [];

  const hasSavedCities = savedOriginCities.length > 0 && savedDestCities.length > 0;
  return { savedOriginCities, savedDestCities, hasSavedCities };
}

function isArchivedLane(lane) {
  return String(lane?.lane_status || lane?.status || '').trim().toLowerCase() === 'archive';
}

function matches(q, l) {
  if (!q) return true;

  const searchTerm = q.toUpperCase().trim();

  // Check base reference ID using unified logic
  if (matchesReferenceId(q, l)) {
    return true;
  }

  // If lane has saved city selections, also check generated pair RR#s
  if (l.saved_origin_cities?.length > 0 && l.saved_dest_cities?.length > 0) {
    const baseRefId = getDisplayReferenceId(l);
    const numPairs = Math.min(l.saved_origin_cities.length, l.saved_dest_cities.length);

    // Check if search matches any of the pair RR#s
    for (let i = 0; i < numPairs; i++) {
      const pairRR = generatePairReferenceId(baseRefId, i);
      if (pairRR && pairRR.toUpperCase().includes(searchTerm)) {
        return true;
      }
    }

    // Also check saved city names
    const savedOrigins = l.saved_origin_cities.map(c => `${c.city}, ${c.state || c.state_or_province}`.toLowerCase()).join(' ');
    const savedDests = l.saved_dest_cities.map(c => `${c.city}, ${c.state || c.state_or_province}`.toLowerCase()).join(' ');
    if (savedOrigins.includes(searchTerm.toLowerCase()) || savedDests.includes(searchTerm.toLowerCase())) {
      return true;
    }
  }

  // Check origin/destination cities and states
  const s = searchTerm.toLowerCase();
  const origin = `${l.origin_city || ''}, ${l.origin_state || ''}`.toLowerCase();
  const dest = `${l.dest_city || l.destination_city || ''}, ${l.dest_state || l.destination_state || ''}`.toLowerCase();
  const equipment = String(l.equipment_code || '').toLowerCase();
  const comment = String(l.comment || '').toLowerCase();

  const cityStateMatch = origin.includes(s) ||
    dest.includes(s) ||
    equipment.includes(s) ||
    comment.includes(s) ||
    (l.origin_city || '').toLowerCase().includes(s) ||
    (l.origin_state || '').toLowerCase().includes(s) ||
    (l.dest_city || l.destination_city || '').toLowerCase().includes(s) ||
    (l.dest_state || l.destination_state || '').toLowerCase().includes(s);

  return cityStateMatch;
}

function LaneCard({ lane, recapData, onGenerateRecap, isGenerating, postedPairs = [], setContactModal }) {
  const router = useRouter();

  // Check if lane has saved city choices (check if arrays exist and have data)
  const hasSavedChoices = lane.saved_origin_cities?.length > 0 &&
    lane.saved_dest_cities?.length > 0;

  // One-to-one pairing: number of pairs is the minimum of the two arrays
  const totalPairs = hasSavedChoices
    ? Math.min(lane.saved_origin_cities.length, lane.saved_dest_cities.length)
    : 0;

  const isCurrent = (lane.lane_status || lane.status) === 'current';

  return (
    <div
      className="group relative transition-all duration-300 hover:-translate-y-1 mb-6"
      id={`lane-${lane.id}`}
      style={{
        background: 'linear-gradient(135deg, rgba(20, 28, 40, 0.48) 0%, rgba(15, 20, 30, 0.4) 100%)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(125, 211, 252, 0.4)',
        borderRadius: '16px',
        boxShadow: '0 12px 34px rgba(2, 6, 23, 0.55), 0 0 22px rgba(56, 189, 248, 0.2)',
        overflow: 'hidden'
      }}
    >
      {/* Top Glow Accent */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

      {/* Header: Route Visual */}
      <div className="p-6 border-b border-slate-200/35 bg-slate-900/40">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl font-bold text-white tracking-tight drop-shadow-md">
                {lane.origin_city}, {lane.origin_state}
              </span>
              <span className="text-cyan-400 text-2xl">→</span>
              <span className="text-xl font-bold text-white tracking-tight drop-shadow-md">
                {lane.dest_city || lane.destination_city}, {lane.dest_state || lane.destination_state}
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-2 py-1 rounded text-xs font-bold bg-cyan-500/35 text-cyan-100 border border-cyan-300/45 uppercase tracking-wider font-mono">
                {getDisplayReferenceId(lane)}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-bold border uppercase tracking-wider ${isCurrent ? 'bg-emerald-500/35 text-emerald-100 border-emerald-300/45' : 'bg-slate-500/35 text-slate-100 border-slate-300/45'}`}>
                {isCurrent ? 'Current' : 'Archived'}
              </span>
              <span className="text-xs text-slate-100 font-medium px-2 py-1 bg-slate-900/38 rounded border border-slate-200/35">
                {lane.equipment_code || '?'} • {lane.length_ft || '?'}ft
              </span>
              {lane.weight_lbs && (
                <span className="text-xs text-slate-100 font-medium px-2 py-1 bg-slate-900/38 rounded border border-slate-200/35">
                  {(lane.weight_lbs / 1000).toFixed(0)}k lbs
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Crawl Cities - Compact List */}
      {hasSavedChoices && (
        <div className="p-6">
          <h4 className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider mb-4">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/35 text-emerald-100 text-xs shadow-lg shadow-emerald-500/30">✓</span>
            Selected Posting Cities
            <span className="text-xs font-normal text-slate-100 normal-case ml-auto">
              ({totalPairs} pairs • {totalPairs * 2} postings with email + phone)
            </span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pickup Cities */}
            <div className="space-y-3">
              <div className="text-[10px] font-bold text-cyan-400/80 uppercase tracking-widest pl-1">Pickup Cities ({lane.saved_origin_cities.length})</div>
              <div className="space-y-2">
                {lane.saved_origin_cities.map((city, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 rounded-lg bg-slate-900/38 border border-slate-200/35 hover:bg-slate-800/45 transition-colors group/item"
                  >
                    <div>
                      <div className="font-medium text-white text-sm">
                        {city.city}, {city.state}
                      </div>
                      <div className="text-[10px] text-slate-100 mt-0.5 font-mono">
                        {city.kma_code} • {city.distance ? `${Math.round(city.distance)} mi` : 'N/A'}
                      </div>
                    </div>
                    <button
                      onClick={() => setContactModal({ open: true, lane, city, cityType: 'pickup' })}
                      className="px-2 py-1.5 rounded bg-cyan-500/35 text-cyan-100 text-[10px] font-bold border border-cyan-300/45 hover:bg-cyan-500/45 transition-colors opacity-0 group-hover/item:opacity-100"
                    >
                      📞 LOG CONTACT
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Cities */}
            <div className="space-y-3">
              <div className="text-[10px] font-bold text-cyan-400/80 uppercase tracking-widest pl-1">Delivery Cities ({lane.saved_dest_cities.length})</div>
              <div className="space-y-2">
                {lane.saved_dest_cities.map((city, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 rounded-lg bg-slate-900/38 border border-slate-200/35 hover:bg-slate-800/45 transition-colors group/item"
                  >
                    <div>
                      <div className="font-medium text-white text-sm">
                        {city.city}, {city.state}
                      </div>
                      <div className="text-[10px] text-slate-100 mt-0.5 font-mono">
                        {city.kma_code} • {city.distance ? `${Math.round(city.distance)} mi` : 'N/A'}
                      </div>
                    </div>
                    <button
                      onClick={() => setContactModal({ open: true, lane, city, cityType: 'delivery' })}
                      className="px-2 py-1.5 rounded bg-cyan-500/35 text-cyan-100 text-[10px] font-bold border border-cyan-300/45 hover:bg-cyan-500/45 transition-colors opacity-0 group-hover/item:opacity-100"
                    >
                      📞 LOG CONTACT
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legacy AI recap display (only if specifically generated) */}
      {recapData && recapData.bullets && (
        <div className="p-6 border-t border-slate-200/35 bg-cyan-900/35">
          <div className="mb-4">
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3">AI Talking Points</h4>
            <ul className="space-y-2">
              {recapData.bullets.map((bullet, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-100">
                  <span className="text-cyan-500 mt-0.5">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {recapData.risks && recapData.risks.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-3">Risk Factors</h4>
              <ul className="space-y-2">
                {recapData.risks.map((risk, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-100">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recapData.price_hint && (
            <div className="p-4 bg-slate-900/38 border border-slate-200/35 rounded-xl">
              <div className="text-xs text-slate-100 mb-2 uppercase tracking-wide font-bold">Estimated Rate Market</div>
              <div className="flex items-center justify-between text-sm font-mono">
                <span className="text-red-400">${recapData.price_hint.low}/mi</span>
                <div className="h-0.5 flex-1 bg-slate-200/35 mx-3 rounded-full relative">
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div>
                </div>
                <span className="text-emerald-400">${recapData.price_hint.mid}/mi</span>
                <div className="h-0.5 flex-1 bg-slate-200/35 mx-3 rounded-full"></div>
                <span className="text-cyan-400">${recapData.price_hint.high}/mi</span>
              </div>
              <div className="mt-2 text-[10px] text-slate-100 text-right">Based on: {recapData.price_hint.basis}</div>
            </div>
          )}
        </div>
      )}

      {/* Show generate button only for lanes that need AI insights */}
      {!recapData && (lane.lane_status || lane.status) !== 'archive' && (
        <div className="p-4 border-t border-slate-200/35 flex justify-center bg-slate-900/38">
          <button
            onClick={() => onGenerateRecap(lane.id)}
            disabled={isGenerating}
            className="px-4 py-2 rounded-lg bg-slate-900/38 hover:bg-slate-800/45 text-white text-xs font-bold border border-slate-200/35 transition-all flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <span className="animate-spin h-3 w-3 border-2 border-slate-100/45 border-t-white rounded-full"></span>
                Generating...
              </>
            ) : (
              <>✨ Generate AI Insights</>
            )}
          </button>
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
  const [onlyWithSavedCities, setOnlyWithSavedCities] = useState(false);
  const [sortOrder, setSortOrder] = useState('date');
  const [postedPairs, setPostedPairs] = useState([]); // Store all generated pairs for dropdown
  const [selectedLaneId, setSelectedLaneId] = useState(''); // For dropdown snap-to functionality
  const [isGeneratingCSV, setIsGeneratingCSV] = useState(false);
  const [viewMode, setViewMode] = useState('classic'); // 'classic' or 'dynamic' - default to classic for saved city selections
  const [contactModal, setContactModal] = useState({ open: false, lane: null, city: null, cityType: null });
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailLanes, setEmailLanes] = useState([]);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [selectedLaneIds, setSelectedLaneIds] = useState([]);
  const [loadWarning, setLoadWarning] = useState('');

  // Generate CSV for selected lanes or all visible lanes
  async function generateCSV(laneIds = [], contactMethod = 'both') {
    try {
      setIsGeneratingCSV(true);
      setCsvModalOpen(false);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert('Authentication required. Please refresh the page and try again.');
        return;
      }

      // Get lanes to export - either selected ones or all filtered
      const lanesToExport = laneIds.length > 0
        ? filtered.filter(l => laneIds.includes(l.id))
        : filtered;

      // Filter to only lanes with saved choices
      const lanesWithChoices = lanesToExport.filter(l =>
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

      // Build query params with lane IDs if specified
      let apiUrl = `/api/exportSavedCitiesCsv?contactMethod=${contactMethod}`;
      if (laneIds.length > 0) {
        apiUrl += `&laneIds=${laneIds.join(',')}`;
      }

      // Call the new CSV export API for saved city selections
      const response = await fetch(apiUrl, {
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
      link.download = `RapidRoutes Posts.csv`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // alert(`CSV generated successfully! File contains ${lanesWithChoices.length} lane(s) with ${totalPairs} city pairs and RR# tracking numbers.`);

    } catch (error) {
      console.error('CSV Generation Error:', error);
      alert(`Failed to generate CSV: ${error.message}`);
    } finally {
      setIsGeneratingCSV(false);
    }
  }

  async function handleGenerateEmail() {
    setIsGeneratingEmail(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert('Authentication required. Please refresh the page and try again.');
        return;
      }

      const response = await fetch('/api/email-template/available-loads', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch available loads');
      }
      const data = await response.json();
      if (data.lanes && data.lanes.length > 0) {
        setEmailLanes(data.lanes);
        setEmailModalOpen(true);
      } else {
        alert('No available loads to generate an email for.');
      }
    } catch (error) {
      console.error('Email Generation Error:', error);
      alert(`Failed to generate email: ${error.message}`);
    } finally {
      setIsGeneratingEmail(false);
    }
  }

  // Scroll to lane function
  const scrollToLane = (laneId) => {
    const element = document.getElementById(`lane-${laneId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add highlight effect
      element.style.transition = 'box-shadow 0.3s ease';
      element.style.boxShadow = '0 0 0 4px #06b6d4';
      setTimeout(() => {
        element.style.boxShadow = '';
      }, 2000);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadWarning('');

    (async () => {
      try {
        const requestFilters = { status: 'current', limit: 300, throwOnError: true };
        const records = await fetchLaneRecordsBrowser(requestFilters);
        if (cancelled) return;

        const normalizedRecords = (records || []).map((lane) => {
          const destCity = lane.dest_city || lane.destination_city || null;
          const destState = lane.dest_state || lane.destination_state || null;
          const { savedOriginCities, savedDestCities, hasSavedCities } = getSavedCityState(lane);

          return {
            ...lane,
            dest_city: destCity,
            dest_state: destState,
            destination_city: lane.destination_city || destCity,
            destination_state: lane.destination_state || destState,
            saved_origin_cities: savedOriginCities,
            saved_dest_cities: savedDestCities,
            hasSavedCities,
            lane_status: lane.lane_status || lane.status || 'current',
            status: lane.status || lane.lane_status || 'current'
          };
        });

        if (process.env.NODE_ENV !== 'production') {
          const withSavedCitySelections = normalizedRecords.filter((l) => l.hasSavedCities).length;
          const missingSavedCitySelections = normalizedRecords.filter((l) => !l.hasSavedCities);

          console.log('[Recap] lanes loaded', {
            filters: requestFilters,
            totalFetched: normalizedRecords.length,
            withSavedCitySelections,
            withoutSavedCitySelections: normalizedRecords.length - withSavedCitySelections
          });

          if (normalizedRecords.length === 0) {
            console.log('[Recap] No lanes returned for current user/org scope.');
          }

          if (missingSavedCitySelections.length > 0) {
            missingSavedCitySelections.slice(0, 25).forEach((lane) => {
              console.log('[Recap] lane missing saved city selections', {
                lane_id: lane.id,
                created_at: lane.created_at,
                org_id: lane.organization_id,
                saved_origin_cities_state: Array.isArray(lane.saved_origin_cities)
                  ? `array(${lane.saved_origin_cities.length})`
                  : lane.saved_origin_cities == null ? 'null' : typeof lane.saved_origin_cities,
                saved_dest_cities_state: Array.isArray(lane.saved_dest_cities)
                  ? `array(${lane.saved_dest_cities.length})`
                  : lane.saved_dest_cities == null ? 'null' : typeof lane.saved_dest_cities
              });
            });
          }
        }

        setLanes(normalizedRecords);
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading lanes:', error);
        setLanes([]);
        setLoadWarning('Unable to load lanes for Recap right now. Please refresh and try again.');
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
    let result = (lanes || [])
      .filter((lane) => !isArchivedLane(lane))
      .filter((lane) => matches(q, lane));

    if (onlyWithSavedCities) {
      result = result.filter((lane) => lane.hasSavedCities);
    }

    // Apply AI-only filter if enabled
    if (showAIOnly) {
      result = result.filter(lane => recaps[lane.id]);
    }

    // Apply sorting
    if (sortOrder === 'origin') {
      result.sort((a, b) => `${a.origin_city}, ${a.origin_state}`.localeCompare(`${b.origin_city}, ${b.origin_state}`));
    } else if (sortOrder === 'dest') {
      result.sort((a, b) =>
        `${a.dest_city || a.destination_city || ''}, ${a.dest_state || a.destination_state || ''}`.localeCompare(
          `${b.dest_city || b.destination_city || ''}, ${b.dest_state || b.destination_state || ''}`
        )
      );
    } else if (sortOrder === 'equipment') {
      result.sort((a, b) => a.equipment_code.localeCompare(b.equipment_code));
    }
    // date sorting is default (no need to sort again)

    return result;
  }, [lanes, q, recaps, showAIOnly, sortOrder, onlyWithSavedCities]);

  const totalCurrentLanes = (lanes || []).filter((lane) => !isArchivedLane(lane)).length;
  const filteredSavedLanesCount = filtered.filter((lane) => lane.hasSavedCities).length;
  const csvLanes = filtered.filter((lane) => !isArchivedLane(lane));

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

  // === Intelligent Lane Card Handlers ===

  const handleArchive = async (laneId, archiveData) => {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/lanes/archive-covered', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify({
        laneId,
        mc: archiveData?.mc,
        email: archiveData?.email,
        rate: archiveData?.rate,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok && result.success) {
      // Remove archived lane immediately from Recap UI/CSV scope
      setLanes(prev => prev.filter((lane) => lane.id !== laneId));
      setSelectedLaneIds(prev => prev.filter((id) => id !== laneId));
      setRecaps(prev => {
        if (!prev[laneId]) return prev;
        const next = { ...prev };
        delete next[laneId];
        return next;
      });
    } else {
      alert('Failed to archive lane: ' + (result.error || `HTTP ${response.status}`));
    }
  };

  const handleGaveBack = async (laneId, reason) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', session?.user?.id)
      .single();

    const result = await markLaneGaveBack(
      laneId,
      reason,
      profile?.organization_id
    );

    if (result.success) {
      setLanes(prev => prev.map(l =>
        l.id === laneId ? {
          ...l,
          lane_status: 'archive',
          gave_back_at: new Date().toISOString(),
          gave_back_reason: reason
        } : l
      ));
    } else {
      alert('Failed to mark lane gave back: ' + result.error);
    }
  };

  const handleBoostRate = async (laneId, percentage) => {
    const result = await boostLaneRate(laneId, percentage);

    if (result.success) {
      setLanes(prev => prev.map(l =>
        l.id === laneId ? { ...l, ...result.newRates } : l
      ));
      alert(`Rate boosted by ${percentage}%!`);
    } else {
      alert('Failed to boost rate: ' + result.error);
    }
  };

  const handleAddCarrierOffer = async (laneId, offerData) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', session?.user?.id)
      .single();

    const result = await addCarrierOffer(
      laneId,
      offerData,
      session?.user?.id,
      profile?.organization_id
    );

    if (result.success) {
      // Add offer to local state
      setLanes(prev => prev.map(l =>
        l.id === laneId ? {
          ...l,
          carrier_offers: [...(l.carrier_offers || []), offerData]
        } : l
      ));
    } else {
      alert('Failed to add carrier offer: ' + result.error);
    }
  };

  const handleTogglePriority = async (laneId) => {
    const result = await toggleLanePriority(laneId);

    if (result.success) {
      setLanes(prev => prev.map(l =>
        l.id === laneId ? { ...l, is_priority: result.isPriority } : l
      ));
    } else {
      alert('Failed to toggle priority: ' + result.error);
    }
  };

  const handleLaneSelect = (laneId, isSelected) => {
    setSelectedLaneIds(prev =>
      isSelected
        ? [...prev, laneId]
        : prev.filter(id => id !== laneId)
    );
  };

  // Stats
  const stats = {
    total: filtered.length,
    active: filtered.filter(l => (l.lane_status || l.status) === 'current').length,
    archived: filtered.filter(l => (l.lane_status || l.status) === 'archive').length
  };

  return (
    <AppBackground>
      <DashboardLayout title="Recap | RapidRoutes" stats={stats}>
      <section className="recap-page flex flex-col gap-6 pb-4">
      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Active Lane Postings
          </h1>
          <p className="text-slate-200">Manage generated city pairs and export for DAT</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setCsvModalOpen(true)}
            className="rr-btn rr-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={filteredSavedLanesCount === 0 || isGeneratingCSV}
          >
            {isGeneratingCSV ? '⏳ Generating...' : '📥 Generate DAT Bulk Upload CSV'}
          </button>
          <button
            onClick={openExportView}
            className="rr-btn btn-outline"
          >
            📄 Print Recap
          </button>
          <button
            onClick={handleGenerateEmail}
            className="rr-btn rr-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isGeneratingEmail}
          >
            {isGeneratingEmail ? '⏳ Generating...' : '✉️ Generate Email'}
          </button>
        </div>
      </div>

      {loadWarning && (
        <div className="rr-card mb-1 rounded-xl border border-amber-300/45 bg-amber-500/35 p-3 text-sm text-amber-100">
          {loadWarning}
        </div>
      )}

      {/* Control Bar */}
      <div className="rr-card-elevated sticky top-4 z-40 p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex flex-col sm:flex-row gap-3">

          {/* Jump to Lane */}
          <div className="relative min-w-[220px]">
            <select
              value={selectedLaneId}
              onChange={(e) => {
                setSelectedLaneId(e.target.value);
                if (e.target.value) {
                  scrollToLane(e.target.value);
                }
              }}
              className="rr-input h-10 pl-3 pr-8 text-sm appearance-none"
            >
              <option value="">Jump to Lane...</option>
              {filtered.flatMap(lane => {
                const baseRefId = getDisplayReferenceId(lane);
                const hasSavedChoices = lane.saved_origin_cities?.length > 0 && lane.saved_dest_cities?.length > 0;

                if (!hasSavedChoices) {
                  // No saved choices, show original lane only
                  return [{
                    id: lane.id,
                    laneId: lane.id,
                    key: lane.id,
                    refId: baseRefId,
                    origin: `${lane.origin_city || '?'}, ${lane.origin_state || '?'}`,
                    dest: `${lane.dest_city || lane.destination_city || '?'}, ${lane.dest_state || lane.destination_state || '?'}`,
                    sortKey: `${lane.origin_city || '?'}, ${lane.origin_state || '?'} → ${lane.dest_city || lane.destination_city || '?'}, ${lane.dest_state || lane.destination_state || '?'}`
                  }];
                }

                // Generate all pair options
                const numPairs = Math.min(lane.saved_origin_cities.length, lane.saved_dest_cities.length);
                const options = [];

                for (let i = 0; i < numPairs; i++) {
                  const pairRR = generatePairReferenceId(baseRefId, i);
                  const originCity = lane.saved_origin_cities[i];
                  const destCity = lane.saved_dest_cities[i];
                  const origin = `${originCity.city}, ${originCity.state || originCity.state_or_province}`;
                  const dest = `${destCity.city}, ${destCity.state || destCity.state_or_province}`;

                  options.push({
                    id: `${lane.id}-pair-${i}`,
                    laneId: lane.id,
                    key: `${lane.id}-pair-${i}`,
                    refId: pairRR,
                    origin,
                    dest,
                    sortKey: `${origin} → ${dest}`
                  });
                }

                return options;
              }).sort((a, b) => a.sortKey.localeCompare(b.sortKey)).map(opt => (
                <option key={opt.key} value={opt.laneId}>
                  {opt.refId} • {opt.origin} → {opt.dest}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 text-xs">▼</div>
          </div>



          {/* Sort */}
          <div className="relative min-w-[160px]">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="rr-input h-10 pl-3 pr-8 text-sm appearance-none"
            >
              <option value="date">Newest First</option>
              <option value="origin">City: Origin</option>
              <option value="dest">City: Destination</option>
              <option value="equipment">Equipment</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 text-xs">▼</div>
          </div>
          </div>

          <label className="h-10 inline-flex items-center gap-2 px-3 rounded-xl bg-slate-900/45 border border-slate-300/35 text-xs text-slate-100 whitespace-nowrap">
            <input
              type="checkbox"
              checked={onlyWithSavedCities}
              onChange={(e) => setOnlyWithSavedCities(e.target.checked)}
              className="rounded border-slate-300/45 bg-slate-900/45 text-cyan-500 focus:ring-0"
            />
            <span>Only lanes with saved cities</span>
          </label>
        </div>
      </div>

      {/* Content Grid */}
      <div className="space-y-6">
        {filtered.length === 0 ? (
          <div className="rr-card-elevated flex flex-col items-center justify-center p-14 border-2 border-dashed border-slate-300/35 rounded-3xl text-center">
            <div className="text-6xl mb-6 opacity-30">📭</div>
            <h3 className="text-xl font-bold text-white mb-2">
              {totalCurrentLanes === 0 ? 'No active recaps found' : 'No lanes match current filters'}
            </h3>
            <p className="text-slate-200 max-w-md mx-auto mb-8">
              {totalCurrentLanes === 0
                ? (q ? 'Try adjusting your search filters.' : 'Lanes appear here after they are created in the Lane Constructor.')
                : (onlyWithSavedCities
                  ? 'Current lanes exist, but none in this view have saved city selections yet.'
                  : 'Current lanes exist. Try clearing search or filter options.')}
            </p>
            {!q && totalCurrentLanes === 0 && (
              <Link href="/lanes" className="rr-btn rr-btn-primary">
                Create New Lane
              </Link>
            )}
          </div>
        ) : (
          filtered.map((lane) => (
            <IntelligentLaneCard
              key={lane.id}
              lane={lane}
              recapData={recaps[lane.id]}
              isSelected={selectedLaneIds.includes(lane.id)}
              onSelect={handleLaneSelect}
              onGenerateRecap={handleGenerateRecap}
              isGenerating={generatingIds.has(lane.id)}
              postedPairs={postedPairs}
              setContactModal={setContactModal}
              onArchive={handleArchive}
              onGaveBack={handleGaveBack}
              onBoostRate={handleBoostRate}
              onAddCarrierOffer={handleAddCarrierOffer}
              onTogglePriority={handleTogglePriority}
              onExportCSV={(ids) => {
                setSelectedLaneIds(ids);
                setCsvModalOpen(true);
              }}
            />
          ))
        )}
      </div>

      <LogContactModal
        isOpen={contactModal.open}
        onClose={() => setContactModal({ open: false, lane: null, city: null, cityType: null })}
        lane={contactModal.lane}
        city={contactModal.city}
        cityType={contactModal.cityType}
      />

      <EmailTemplateModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        lanes={emailLanes}
      />

      <CSVExportModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        lanes={csvLanes}
        selectedLaneIds={selectedLaneIds}
        onExport={(laneIds, contactMethod) => generateCSV(laneIds, contactMethod)}
      />
      </section>
      </DashboardLayout>
    </AppBackground>
  );
}

// Recap P0 Manual Test Checklist:
// 1) Create lane A -> B in /lanes and save. Verify lane exists in `lanes` with org/user and city fields populated.
// 2) Open /recap (or refresh). Confirm lane appears with origin/destination city-state even without saved cities.
// 3) Verify badge behavior: lanes with arrays show "City Selection Saved"; lanes without arrays show "Needs City Selection".
// 4) Toggle "Only lanes with saved cities" on/off and verify client-side filtering behavior.
// 5) Verify status/org behavior: lane appears when lane_status/status is null (treated as current) and remains org-scoped.
