// pages/smart-recap.js
// Smart recap page for intelligent lane matching and performance tracking

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';

export default function SmartRecap() {
  const [lanes, setLanes] = useState([]);
  const [allPostedPairs, setAllPostedPairs] = useState([]);
  const [selectedPair, setSelectedPair] = useState(null);
  const [originalLane, setOriginalLane] = useState(null);
  const [loading, setLoading] = useState(false);
  const [distance, setDistance] = useState(null);

  useEffect(() => {
    fetchAllPostedPairs();
  }, []);

  const fetchAllPostedPairs = async () => {
    console.log('🔍 Fetching all posted city pairs...');
    setLoading(true);
    try {
      // Get all active lanes first
      const lanesResponse = await fetch('/api/lanes');
      if (!lanesResponse.ok) throw new Error('Failed to fetch lanes');
      const lanesData = await lanesResponse.json();
      
      const activeLanes = lanesData.filter(lane => 
        lane.status === 'pending' || lane.status === 'posted'
      );
      
      setLanes(activeLanes);
      console.log('📋 Active lanes loaded:', activeLanes.length);

      // Get all posted pairs for all lanes
      const allPairs = [];
      for (const lane of activeLanes) {
        try {
          const response = await fetch(`/api/getPostedPairs?laneId=${lane.id}`);
          if (response.ok) {
            const data = await response.json();
            // Add each posted pair with reference to original lane
            data.postedPairs.forEach(pair => {
              allPairs.push({
                ...pair,
                originalLane: lane,
                displayText: `${pair.pickup.city}, ${pair.pickup.state} → ${pair.delivery.city}, ${pair.delivery.state}`,
                laneInfo: `${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`
              });
            });
          }
        } catch (error) {
          console.error(`Error fetching pairs for lane ${lane.id}:`, error);
        }
      }
      
      console.log('✅ All posted pairs loaded:', allPairs.length);
      setAllPostedPairs(allPairs);
      
    } catch (error) {
      console.error('Error fetching posted pairs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePairSelect = async (pairId) => {
    if (!pairId) {
      setSelectedPair(null);
      setOriginalLane(null);
      setDistance(null);
      return;
    }

    const pair = allPostedPairs.find(p => p.id === pairId);
    if (!pair) return;

    setSelectedPair(pair);
    setOriginalLane(pair.originalLane);

    // Calculate distance between posted pair and original lane
    try {
      setLoading(true);
      const [pickupResponse, deliveryResponse] = await Promise.all([
        fetch(`/api/calculateDistance?city1=${encodeURIComponent(pair.originalLane.origin_city)}&state1=${encodeURIComponent(pair.originalLane.origin_state)}&city2=${encodeURIComponent(pair.pickup.city)}&state2=${encodeURIComponent(pair.pickup.state)}`),
        fetch(`/api/calculateDistance?city1=${encodeURIComponent(pair.originalLane.dest_city)}&state1=${encodeURIComponent(pair.originalLane.dest_state)}&city2=${encodeURIComponent(pair.delivery.city)}&state2=${encodeURIComponent(pair.delivery.state)}`)
      ]);

      const pickupData = await pickupResponse.json();
      const deliveryData = await deliveryResponse.json();

      setDistance({
        pickup: pickupResponse.ok ? pickupData.distance : null,
        delivery: deliveryResponse.ok ? deliveryData.distance : null
      });
    } catch (error) {
      console.error('Distance calculation error:', error);
      setDistance({ pickup: null, delivery: null });
    } finally {
      setLoading(false);
    }
  };

  const trackPerformance = async (action) => {
    if (!selectedPair || !originalLane) return;
    
    try {
      const response = await fetch('/api/trackRecapAction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          laneId: originalLane.id,
          action: action,
          cityPair: selectedPair.displayText,
          originCity: originalLane.origin_city,
          originState: originalLane.origin_state,
          destCity: originalLane.dest_city,
          destState: originalLane.dest_state,
          equipment: originalLane.equipment_code
        }),
      });

      if (response.ok) {
        console.log(`✅ Tracked ${action} for ${selectedPair.displayText}`);
        alert(`${action.replace('_', ' ')} tracked successfully!`);
      }
    } catch (error) {
      console.error('Error tracking performance:', error);
    }
  };

  const markAsCovered = async () => {
    if (!originalLane) return;
    
    try {
      const response = await fetch('/api/laneStatus', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: originalLane.id,
          status: 'covered'
        }),
      });

      if (response.ok) {
        alert('Lane marked as covered!');
        // Refresh the data
        fetchAllPostedPairs();
        setSelectedPair(null);
        setOriginalLane(null);
        setDistance(null);
      } else {
        alert('Failed to mark lane as covered');
      }
    } catch (error) {
      console.error('Error marking lane as covered:', error);
      alert('Error marking lane as covered');
    }
  };

  const getDistanceColor = (dist) => {
    if (!dist) return 'text-gray-400';
    if (dist < 25) return 'text-green-400';
    if (dist < 75) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Layout>
      <div className="min-h-screen p-6" style={{ background: 'var(--bg-primary)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              🚛 Smart Recap System
            </h1>
            <p style={{ color: 'var(--text-tertiary)' }}>
              Find generated lanes when carriers call in
            </p>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="rounded-lg p-4 text-center" style={{ background: 'var(--surface)', borderColor: 'var(--border-default)' }}>
              <div className="text-2xl font-bold text-blue-400">{lanes.length}</div>
              <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Active Lanes</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
              <div className="text-2xl font-bold text-green-400">{allPostedPairs.length}</div>
              <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Posted Pairs</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
              <div className="text-2xl font-bold text-yellow-400">{allPostedPairs.length * 2}</div>
              <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Postings</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
              <div className="text-2xl font-bold text-purple-400">DAT</div>
              <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Platform</div>
            </div>
          </div>

          {/* Dropdown Section */}
          <div className="rounded-lg p-6 mb-8" style={{ background: 'var(--surface)', borderColor: 'var(--border-default)' }}>
            <label className="block text-lg font-medium text-blue-400 mb-4">
              🔍 Find Generated Lane (for incoming calls):
            </label>
            
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
                <span className="text-gray-300">Loading posted pairs...</span>
              </div>
            )}
            
            {!loading && (
              <div className="space-y-4">
                <select
                  value={selectedPair?.id || ''}
                  onChange={(e) => handlePairSelect(e.target.value)}
                  className="w-full border-2 border-blue-500 rounded-lg px-4 py-3 text-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  style={{ background: 'var(--input-bg)', color: 'var(--text-primary)' }}
                  disabled={loading}
                >
                  <option value="">Select a posted lane to find...</option>
                  {allPostedPairs.map((pair) => (
                    <option key={pair.id} value={pair.id}>
                      {pair.displayText}
                    </option>
                  ))}
                </select>
                
                {allPostedPairs.length === 0 && !loading && (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-4xl mb-4">📭</div>
                    <div>No posted pairs found</div>
                    <div className="text-sm mt-2">Generate some lanes first to see options here</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Pair Information */}
          {selectedPair && originalLane && (
            <div className="space-y-6">
              {/* Matching Information */}
              <div className="rounded-lg border-2 border-blue-500 p-6" style={{ background: 'var(--surface)' }}>
                <h2 className="text-xl font-bold text-blue-400 mb-4">
                  📍 Lane Match Details
                </h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Original Lane:</h3>
                    <div className="rounded p-4" style={{ background: 'var(--bg-primary)' }}>
                      <div className="text-gray-100">
                        {originalLane.origin_city}, {originalLane.origin_state} → {originalLane.dest_city}, {originalLane.dest_state}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        {originalLane.equipment_code} • {originalLane.weight_lbs?.toLocaleString()} lbs
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Posted Pair (Carrier Called About):</h3>
                    <div className="rounded p-4" style={{ background: 'var(--bg-primary)' }}>
                      <div className="text-gray-100">
                        {selectedPair.pickup.city}, {selectedPair.pickup.state} → {selectedPair.delivery.city}, {selectedPair.delivery.state}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        Generated variation
                      </div>
                    </div>
                  </div>
                </div>

                {/* Distance Information */}
                {distance && (
                  <div className="mt-6 grid md:grid-cols-2 gap-4">
                    <div className="rounded p-4" style={{ background: 'var(--bg-primary)' }}>
                      <h4 className="font-semibold text-gray-300 mb-2">Pickup Distance:</h4>
                      <div className={`text-2xl font-bold ${getDistanceColor(distance.pickup)}`}>
                        {distance.pickup ? `${distance.pickup.toFixed(1)} miles` : 'Unknown'}
                      </div>
                    </div>
                    <div className="rounded p-4" style={{ background: 'var(--bg-primary)' }}>
                      <h4 className="font-semibold text-gray-300 mb-2">Delivery Distance:</h4>
                      <div className={`text-2xl font-bold ${getDistanceColor(distance.delivery)}`}>
                        {distance.delivery ? `${distance.delivery.toFixed(1)} miles` : 'Unknown'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-lg p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border-default)' }}>
                  <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Track Performance</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => trackPerformance('email_sent')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                    >
                      📧 Email Sent
                    </button>
                    <button
                      onClick={() => trackPerformance('call_received')}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                    >
                      📞 Call Received
                    </button>
                    <button
                      onClick={() => trackPerformance('quote_requested')}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium"
                    >
                      💰 Quote Requested
                    </button>
                    <button
                      onClick={() => trackPerformance('load_booked')}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium"
                    >
                      🚛 Load Booked
                    </button>
                  </div>
                </div>

                <div className="rounded-lg p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border-default)' }}>
                  <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Lane Actions</h3>
                  <div className="space-y-3">
                    <button
                      onClick={markAsCovered}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                    >
                      ✅ Mark Lane as Covered
                    </button>
                    <button
                      onClick={() => window.open(`/api/exportRecapHtml?laneId=${originalLane.id}`, '_blank')}
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                    >
                      � Download HTML Recap
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Help Section */}
          <div className="mt-8 bg-blue-900 bg-opacity-50 rounded-lg p-6 border border-blue-700">
            <h3 className="text-lg font-semibold text-blue-100 mb-3">
              How to Use Smart Recap
            </h3>
            <div className="space-y-2 text-blue-200 text-sm">
              <p>
                <strong>1. Carrier Calls:</strong> When a carrier calls about a specific city pair
              </p>
              <p>
                <strong>2. Find the Lane:</strong> Use the dropdown to find which posted pair they're calling about
              </p>
              <p>
                <strong>3. View Match:</strong> See the distance between posted pair and your original lane
              </p>
              <p>
                <strong>4. Track Performance:</strong> Record emails, calls, quotes, and bookings
              </p>
              <p>
                <strong>5. Mark Covered:</strong> Remove completed lanes from active list
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
