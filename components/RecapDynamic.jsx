// components/RecapDynamic.jsx
// Dynamic Recap 2.0 - Collapsible lanes with RR# search, dropdown navigation, and smart city learning

import { useState, useEffect, useRef } from 'react';
import { getBrowserSupabase } from '../lib/supabaseClient';
import CoverageModal from './CoverageModal.jsx';

export default function RecapDynamic({ lanes = [], onRefresh }) {
  const [searchQuery, setSearchQuery] = useState('RR');
  const [selectedLane, setSelectedLane] = useState(null);
  const [activeHighlight, setActiveHighlight] = useState(null);
  const [collapsedLanes, setCollapsedLanes] = useState(new Set());
  const [coverageModalOpen, setCoverageModalOpen] = useState(false);
  const [selectedRRForCoverage, setSelectedRRForCoverage] = useState(null);
  // Keep a consistent shape: Set of "City, ST" keys
  const [starredCities, setStarredCities] = useState(new Set());
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  const supabase = getBrowserSupabase();
  const laneRefs = useRef({});

  // Load starred cities once on mount – build a Set for O(1) membership checks
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/city-performance');
        const result = await response.json();
        if (cancelled) return;

        if (result && Array.isArray(result.data)) {
          const set = new Set(
            result.data
              .filter(Boolean)
              .map((city) => `${city.city_name}, ${city.state_code}`.toUpperCase())
          );
          setStarredCities(set);
        } else {
          console.warn('⚠️ [RecapDynamic] No starred cities data available');
          setStarredCities(new Set());
        }
      } catch (err) {
        console.error('❌ [RecapDynamic] Failed to fetch starred cities:', err);
        setStarredCities(new Set());
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ESC key listener to clear highlight
  useEffect(() => {
    function handleEscape(e) {
      if (e.key === 'Escape') {
        setActiveHighlight(null);
        setSelectedLane(null);
      }
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  // Realtime subscription for lane updates
  useEffect(() => {
    const channel = supabase
      .channel('recap-lanes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lanes'
        },
        (payload) => {
          console.log('Lane updated:', payload);
          onRefresh?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, onRefresh]);

  // Group lanes by origin/destination
  const laneGroups = lanes.reduce((acc, lane) => {
    const key = `${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`;
    if (!acc[key]) {
      acc[key] = {
        key,
        originCity: lane.origin_city,
        originState: lane.origin_state,
        destCity: lane.dest_city,
        destState: lane.dest_state,
        lanes: []
      };
    }
    acc[key].lanes.push(lane);
    return acc;
  }, {});

  const groupArray = Object.values(laneGroups);

  // Filter lanes based on search
  const filteredGroups = groupArray.filter(group => {
    if (!searchQuery || searchQuery === 'RR') return true;
    
    const query = searchQuery.toLowerCase();
    const matchesCity = 
      group.originCity?.toLowerCase().includes(query) ||
      group.originState?.toLowerCase().includes(query) ||
      group.destCity?.toLowerCase().includes(query) ||
      group.destState?.toLowerCase().includes(query);
    
    const matchesRR = group.lanes.some(lane => 
      lane.rr_number?.toLowerCase().includes(query)
    );
    
    return matchesCity || matchesRR;
  });

  // Handle lane dropdown selection
  const handleLaneSelect = (groupKey) => {
    setSelectedLane(groupKey);
    setActiveHighlight(groupKey);
    
    // Scroll to lane with smooth animation
    const ref = laneRefs.current[groupKey];
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Expand the lane if collapsed
    setCollapsedLanes(prev => {
      const next = new Set(prev);
      next.delete(groupKey);
      return next;
    });
  };

  // Handle RR# search
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // If exact RR# match, auto-select and scroll
    if (value.startsWith('RR') && value.length >= 5) {
      const matchedGroup = groupArray.find(group =>
        group.lanes.some(lane => 
          lane.rr_number?.toUpperCase() === value.toUpperCase()
        )
      );
      
      if (matchedGroup) {
        handleLaneSelect(matchedGroup.key);
      }
    }
  };

  // Toggle lane collapse
  const toggleLaneCollapse = (groupKey) => {
    setCollapsedLanes(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  // Handle coverage click
  const handleCoverageClick = (lane, group) => {
    setSelectedRRForCoverage({ ...lane, group });
    setCoverageModalOpen(true);
  };

  // Handle coverage selection
  const handleCoverageSelect = async (source) => {
    if (!selectedRRForCoverage) return;
    
    try {
      const { rr_number, origin_city, origin_state, dest_city, dest_state, group, lane_group_id } = selectedRRForCoverage;
      
      // Update origin city performance
      await fetch('/api/city-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: origin_city,
          state: origin_state,
          kma: selectedRRForCoverage.origin_kma,
          coverageSource: source,
          rrNumber: rr_number,
          laneGroupId: lane_group_id
        })
      });
      
      // Update destination city performance
      await fetch('/api/city-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: dest_city,
          state: dest_state,
          kma: selectedRRForCoverage.dest_kma,
          coverageSource: source,
          rrNumber: rr_number
        })
      });
      
      // Refresh recap data
      onRefresh?.();
      
    } catch (error) {
      console.error('Error recording coverage:', error);
    }
  };

  // Get status emoji and color
  const getStatusDisplay = (status) => {
    const statusLower = status?.toLowerCase() || 'pending';
    if (statusLower.includes('cover')) {
      return { emoji: '🟢', text: 'Covered', color: '#10b981' };
    }
    if (statusLower.includes('post')) {
      return { emoji: '🟡', text: 'Posted', color: '#f59e0b' };
    }
    return { emoji: '🔵', text: 'Pending', color: '#3b82f6' };
  };

  // Get coverage source display
  const getCoverageSourceDisplay = (source) => {
    if (!source) return { emoji: '', text: '' };
    switch (source.toUpperCase()) {
      case 'IBC':
        return { emoji: '📞', text: 'IBC – Inbound Call' };
      case 'OBC':
        return { emoji: '📤', text: 'OBC – Outbound Call' };
      case 'EMAIL':
        return { emoji: '✉️', text: 'Email' };
      default:
        return { emoji: '', text: source };
    }
  };

  // Check if city is starred
  const isCityStarred = (city, state) => starredCities.has(`${city}, ${state}`.toUpperCase());

  // Defensive render guard for lanes prop
  if (!lanes || !Array.isArray(lanes)) {
    return <div>Loading Recap Data…</div>;
  }

  // Export HTML
  const handleExportHTML = async () => {
    try {
      const response = await fetch('/api/export/recap-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lanes })
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recap-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting HTML:', error);
    }
  };

  return (
    <div className={isDarkMode ? 'dark-mode' : 'light-mode'}>
      {/* Sticky Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'var(--card-bg)',
        borderBottom: '1px solid var(--border-color)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        {/* RR# Search */}
        <div style={{ flex: '1', minWidth: '200px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="🔍 Search RR# or City..."
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: '8px',
              border: '2px solid var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#06b6d4'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
          />
        </div>

        {/* Lane Dropdown */}
        <div style={{ flex: '1', minWidth: '250px' }}>
          <select
            value={selectedLane || ''}
            onChange={(e) => handleLaneSelect(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: '8px',
              border: '2px solid var(--border-color)',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value="">🗂️ Select Lane...</option>
            {groupArray && groupArray.length > 0 ? (
              groupArray
                .sort((a, b) => a.key.localeCompare(b.key))
                .map(group => {
                  const rrRange = group.lanes && group.lanes.length > 0 
                    ? `${group.lanes[0].rr_number || 'N/A'}-${group.lanes[group.lanes.length - 1].rr_number || 'N/A'}`
                    : 'N/A';
                  return (
                    <option key={group.key} value={group.key}>
                      {group.originCity}, {group.originState} → {group.destCity}, {group.destState} ({rrRange})
                    </option>
                  );
                })
            ) : (
              <option disabled>No lanes available</option>
            )}
          </select>
        </div>

        {/* Dark/Light Toggle */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '2px solid var(--border-color)',
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-primary)',
            fontSize: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          title="Toggle Dark/Light Mode"
        >
          {isDarkMode ? '🌗' : '☀️'}
        </button>

        {/* Export HTML Button */}
        <button
          onClick={handleExportHTML}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '2px solid #06b6d4',
            backgroundColor: isDarkMode ? '#0891b2' : '#06b6d4',
            color: 'white',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#0e7490';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isDarkMode ? '#0891b2' : '#06b6d4';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span>💾</span>
          <span>Export HTML Recap</span>
        </button>
      </div>

      {/* Lane Groups */}
      <div style={{ padding: '24px' }}>
        {filteredGroups.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
              No lanes found
            </div>
            <div style={{ fontSize: '14px' }}>
              Try adjusting your search or generate new lanes
            </div>
          </div>
        )}

        {filteredGroups && filteredGroups.length > 0 ? (
          filteredGroups.map(group => {
            const isCollapsed = collapsedLanes.has(group.key);
            const isHighlighted = activeHighlight === group.key;
            const originStarred = isCityStarred(group.originCity, group.originState);
            const destStarred = isCityStarred(group.destCity, group.destState);

            return (
            <div
              key={group.key}
              ref={el => laneRefs.current[group.key] = el}
              style={{
                marginBottom: '24px',
                borderRadius: '12px',
                border: `2px solid ${isHighlighted ? '#06b6d4' : 'var(--border-color)'}`,
                backgroundColor: 'var(--card-bg)',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                boxShadow: isHighlighted 
                  ? '0 0 20px rgba(6, 182, 212, 0.5)' 
                  : '0 2px 4px rgba(0, 0, 0, 0.1)',
                scrollMarginTop: '100px'
              }}
            >
              {/* Lane Header */}
              <div
                onClick={() => toggleLaneCollapse(group.key)}
                style={{
                  padding: '16px 20px',
                  backgroundColor: isHighlighted ? 'rgba(6, 182, 212, 0.1)' : 'var(--input-bg)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background-color 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>
                    {isCollapsed ? '▶' : '▼'}
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    🚚 {group.originCity}, {group.originState}
                    {originStarred && <span style={{ marginLeft: '4px' }}>⭐</span>}
                    {' → '}
                    {group.destCity}, {group.destState}
                    {destStarred && <span style={{ marginLeft: '4px' }}>⭐</span>}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {group.lanes.length} posting{group.lanes.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Lane Details Table */}
              {!isCollapsed && (
                <div style={{ padding: '20px', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600 }}>RR#</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600 }}>Pickup</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600 }}>Orig KMA</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600 }}>±Mi</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600 }}>Drop</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600 }}>Dest KMA</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600 }}>±Mi</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 600 }}>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.lanes && group.lanes.length > 0 ? (
                        group.lanes.map((lane, idx) => {
                          const status = getStatusDisplay(lane.lane_status || lane.status);
                          const coverageSource = getCoverageSourceDisplay(lane.coverage_source);
                          
                          return (
                          <tr
                            key={lane.id || idx}
                            style={{
                              borderBottom: '1px solid var(--border-color)',
                              backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--hover-bg)'
                            }}
                          >
                            <td style={{ padding: '12px 8px', fontFamily: 'monospace', fontWeight: 600 }}>
                              {lane.rr_number || 'N/A'}
                            </td>
                            <td style={{ padding: '12px 8px' }}>
                              {lane.origin_city}
                            </td>
                            <td style={{ padding: '12px 8px', fontFamily: 'monospace' }}>
                              {lane.origin_kma || 'N/A'}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                              +{lane.origin_miles_offset || 0}
                            </td>
                            <td style={{ padding: '12px 8px' }}>
                              {lane.dest_city}
                            </td>
                            <td style={{ padding: '12px 8px', fontFamily: 'monospace' }}>
                              {lane.dest_kma || 'N/A'}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                              +{lane.dest_miles_offset || 0}
                            </td>
                            <td style={{ padding: '12px 8px' }}>
                              {status.emoji} 
                              <span 
                                style={{ 
                                  marginLeft: '4px',
                                  color: status.color,
                                  fontWeight: 600,
                                  cursor: (lane.lane_status || lane.status)?.toLowerCase() === 'posted' ? 'pointer' : 'default'
                                }}
                                onClick={() => {
                                  if ((lane.lane_status || lane.status)?.toLowerCase() === 'posted') {
                                    handleCoverageClick(lane, group);
                                  }
                                }}
                              >
                                {status.text}
                              </span>
                            </td>
                            <td style={{ padding: '12px 8px' }}>
                              {coverageSource.emoji && (
                                <>
                                  {coverageSource.emoji} <span style={{ marginLeft: '4px' }}>{coverageSource.text}</span>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })
                      ) : (
                        <tr>
                          <td colSpan="9" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No lane details available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })
        ) : (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontSize: '16px'
          }}>
            📦 No lanes to display
          </div>
        )}
      </div>

      {/* Coverage Modal */}
      <CoverageModal
        isOpen={coverageModalOpen}
        onClose={() => {
          setCoverageModalOpen(false);
          setSelectedRRForCoverage(null);
        }}
        onSelect={handleCoverageSelect}
        laneInfo={selectedRRForCoverage}
      />

      {/* ESC Helper Text */}
      {activeHighlight && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '12px 20px',
          backgroundColor: 'rgba(6, 182, 212, 0.9)',
          color: 'white',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          zIndex: 1000
        }}>
          Press ESC to clear highlight
        </div>
      )}
    </div>
  );
}
