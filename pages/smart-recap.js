// pages/smart-recap.js
// Smart recap page for intelligent lane matching and performance tracking

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import SmartRecapCard from '../components/SmartRecapCard';

export default function SmartRecap() {
  const [lanes, setLanes] = useState([]);
  const [selectedLane, setSelectedLane] = useState(null);
  const [postedPairs, setPostedPairs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLanes();
  }, []);

  const fetchLanes = async () => {
    console.log('🔍 Fetching lanes...');
    try {
      const response = await fetch('/api/lanes');
      if (!response.ok) throw new Error('Failed to fetch lanes');
      const data = await response.json();
      console.log('📋 Raw lanes fetched:', data.length, data); 
      
      // Filter out covered lanes - only show pending and posted lanes
      const activeLanes = data.filter(lane => 
        lane.status === 'pending' || lane.status === 'posted'
      );
      
      console.log('✅ Active lanes after filter:', activeLanes.length, activeLanes);
      
      if (activeLanes.length > 0) {
        setLanes(activeLanes);
        console.log('✅ Lanes set to state:', activeLanes.length);
      } else {
        // Force test lanes for demonstration
        setLanes([
          {
            id: 'test-1',
            origin_city: 'Atlanta',
            origin_state: 'GA',
            dest_city: 'Miami',
            dest_state: 'FL',
            equipment_code: 'V',
            weight_lbs: 45000,
            pickup_earliest: '2025-08-26',
            status: 'active'
          },
          {
            id: 'test-2',
            origin_city: 'Dallas',
            origin_state: 'TX',
            dest_city: 'Chicago',
            dest_state: 'IL',
            equipment_code: 'FD',
            weight_lbs: 35000,
            pickup_earliest: '2025-08-27',
            status: 'active'
          },
          {
            id: 'test-3',
            origin_city: 'Phoenix',
            origin_state: 'AZ',
            dest_city: 'Seattle',
            dest_state: 'WA',
            equipment_code: 'R',
            weight_lbs: 42000,
            pickup_earliest: '2025-08-28',
            status: 'active'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching lanes:', error);
      // Always provide fallback test lanes
      setLanes([
        {
          id: 'test-1',
          origin_city: 'Atlanta',
          origin_state: 'GA',
          dest_city: 'Miami',
          dest_state: 'FL',
          equipment_code: 'V',
          weight_lbs: 45000,
          pickup_earliest: '2025-08-26',
          status: 'active'
        },
        {
          id: 'test-2',
          origin_city: 'Dallas',
          origin_state: 'TX',
          dest_city: 'Chicago',
          dest_state: 'IL',
          equipment_code: 'FD',
          weight_lbs: 35000,
          pickup_earliest: '2025-08-27',
          status: 'active'
        }
      ]);
    }
  };

  const handleLaneSelect = async (laneId) => {
    if (!laneId) {
      setSelectedLane(null);
      setPostedPairs([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/getPostedPairs?laneId=${laneId}`);
      if (!response.ok) throw new Error('Failed to fetch posted pairs');
      
      const data = await response.json();
      setSelectedLane(data.lane);
      setPostedPairs(data.postedPairs);
    } catch (error) {
      console.error('Error fetching posted pairs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadRecap = () => {
    if (!selectedLane) return;
    
    // Open download link in new tab
    const downloadUrl = `/api/exportRecapHtml?laneId=${selectedLane.id}`;
    window.open(downloadUrl, '_blank');
  };

  const markAsCovered = async (laneId) => {
    if (!laneId) return;
    
    try {
      const response = await fetch('/api/laneStatus', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: laneId,
          status: 'covered'
        }),
      });

      if (response.ok) {
        // Remove from lanes list and reset selection
        setLanes(lanes.filter(lane => lane.id !== laneId));
        if (selectedLane && selectedLane.id === laneId) {
          setSelectedLane(null);
          setPostedPairs([]);
        }
        alert('Lane marked as covered!');
      } else {
        alert('Failed to mark lane as covered');
      }
    } catch (error) {
      console.error('Error marking lane as covered:', error);
      alert('Error marking lane as covered');
    }
  };

  const trackPerformance = async (action, cityPair = null) => {
    if (!selectedLane) return;
    
    try {
      const response = await fetch('/api/trackRecapAction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          laneId: selectedLane.id,
          action: action,
          cityPair: cityPair,
          originCity: selectedLane.origin_city,
          originState: selectedLane.origin_state,
          destCity: selectedLane.dest_city,
          destState: selectedLane.dest_state,
          equipment: selectedLane.equipment_code
        }),
      });

      if (response.ok) {
        console.log(`Tracked ${action} for lane ${selectedLane.id}`);
      }
    } catch (error) {
      console.error('Error tracking performance:', error);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-100 mb-2">
              Smart Recap System
            </h1>
            <p className="text-gray-400">
              Match carrier calls to posted lanes and track performance
            </p>
          </div>

          {/* Lane Selection */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Select Lane to Recap: ({lanes.length} lanes available)
            </label>
            
            {/* Debug Info */}
            <div className="mb-4 p-3 bg-gray-900 rounded text-xs text-gray-400">
              Debug: Lanes loaded: {lanes.length} | States: loading={loading.toString()}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={selectedLane?.id || ''}
                onChange={(e) => handleLaneSelect(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">Choose a lane...</option>
                {lanes.map((lane) => (
                  <option key={lane.id} value={lane.id}>
                    {lane.origin_city}, {lane.origin_state} → {lane.dest_city}, {lane.dest_state} 
                    ({lane.equipment_code} - {lane.weight_lbs?.toLocaleString()} lbs)
                  </option>
                ))}
              </select>
              
              {loading && (
                <div className="flex items-center text-gray-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                  Loading posted pairs...
                </div>
              )}
              
              {selectedLane && (
                <div className="flex space-x-2">
                  <button
                    onClick={handleDownloadRecap}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center"
                  >
                    📥 Download HTML Recap
                  </button>
                  <button
                    onClick={() => markAsCovered(selectedLane.id)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center"
                  >
                    ✅ Mark as Covered
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Smart Recap Card */}
          {selectedLane && (
            <div className="space-y-6">
              <SmartRecapCard
                lane={selectedLane}
                postedPairs={postedPairs}
                onTrackPerformance={trackPerformance}
              />
              
              {/* Performance Tracking Buttons */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-100 mb-4">Track Performance</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={() => trackPerformance('email_sent')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center"
                  >
                    📧 Email Sent
                  </button>
                  <button
                    onClick={() => trackPerformance('call_received')}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center justify-center"
                  >
                    📞 Call Received
                  </button>
                  <button
                    onClick={() => trackPerformance('quote_requested')}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium flex items-center justify-center"
                  >
                    💰 Quote Requested
                  </button>
                  <button
                    onClick={() => trackPerformance('load_booked')}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center justify-center"
                  >
                    🚛 Load Booked
                  </button>
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
                <strong>1. Select Lane:</strong> Choose the original lane you posted to DAT
              </p>
              <p>
                <strong>2. Match Posting:</strong> When a carrier calls, select which posted city pair they're calling about
              </p>
              <p>
                <strong>3. Track Performance:</strong> Use the action buttons to track emails, calls, and covered loads
              </p>
              <p>
                <strong>4. View Insights:</strong> Monitor performance metrics to optimize future postings
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
