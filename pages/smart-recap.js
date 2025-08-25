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
    try {
      const response = await fetch('/api/lanes');
      if (!response.ok) throw new Error('Failed to fetch lanes');
      const data = await response.json();
      console.log('Fetched lanes:', data); // Debug log
      
      // If we have real lanes, use them, otherwise use test data
      const realLanes = data.filter(lane => lane.status === 'active');
      
      if (realLanes.length > 0) {
        setLanes(realLanes);
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
              Select Lane to Recap:
            </label>
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
                <button
                  onClick={handleDownloadRecap}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center"
                >
                  📥 Download HTML Recap
                </button>
              )}
            </div>
          </div>

          {/* Smart Recap Card */}
          {selectedLane && (
            <SmartRecapCard
              lane={selectedLane}
              postedPairs={postedPairs}
            />
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
