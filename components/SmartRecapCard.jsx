// components/SmartRecapCard.js
// Smart recap system for matching posted lanes to actual lanes with distance tracking

import { useState, useEffect } from 'react';

const SmartRecapCard = ({ lane, postedPairs = [], onTrackPerformance }) => {
  const [selectedPosting, setSelectedPosting] = useState(null);
  const [distances, setDistances] = useState({ pickup: null, delivery: null });
  const [trackingData, setTrackingData] = useState({});

  // Calculate distances when posting is selected
  useEffect(() => {
    if (selectedPosting && lane) {
      calculateDistances();
    }
  }, [selectedPosting, lane]);

  const calculateDistances = async () => {
    try {
      const [pickupResponse, deliveryResponse] = await Promise.all([
        fetch(`/api/calculateDistance?city1=${encodeURIComponent(lane.origin_city)}&state1=${encodeURIComponent(lane.origin_state)}&city2=${encodeURIComponent(selectedPosting.pickup.city)}&state2=${encodeURIComponent(selectedPosting.pickup.state)}`),
        fetch(`/api/calculateDistance?city1=${encodeURIComponent(lane.dest_city)}&state1=${encodeURIComponent(lane.dest_state)}&city2=${encodeURIComponent(selectedPosting.delivery.city)}&state2=${encodeURIComponent(selectedPosting.delivery.state)}`)
      ]);

      const pickupData = await pickupResponse.json();
      const deliveryData = await deliveryResponse.json();

      setDistances({
        pickup: pickupResponse.ok ? pickupData.distance : null,
        delivery: deliveryResponse.ok ? deliveryData.distance : null
      });
    } catch (error) {
      console.error('Distance calculation error:', error);
      setDistances({ pickup: null, delivery: null });
    }
  };

  const handleTrackingUpdate = async (postingId, action) => {
    // Update local state immediately
    setTrackingData(prev => ({
      ...prev,
      [postingId]: {
        ...prev[postingId],
        [action]: true,
        lastUpdated: new Date().toISOString()
      }
    }));
    
    try {
      // Save to database
      const response = await fetch('/api/trackRecapAction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          laneId: lane.id,
          postedPairId: postingId,
          actionType: action,
          pickupDistance: distances.pickup,
          deliveryDistance: distances.delivery,
          notes: `${action} tracked for ${selectedPosting.pickup.city || '?'}, ${selectedPosting.pickup.state || '?'} → ${selectedPosting.delivery.city || '?'}, ${selectedPosting.delivery.state || '?'}`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save tracking data');
      }

      console.log(`✅ Successfully tracked ${action} for posting ${postingId}`);
    } catch (error) {
      console.error('Error saving tracking data:', error);
      // Could show a toast notification here
    }
  };

  const getTrackingStatus = (postingId) => {
    const data = trackingData[postingId];
    if (!data) return null;
    
    if (data.covered) return { label: 'Covered', color: 'bg-green-600' };
    if (data.call) return { label: 'Call', color: 'bg-blue-600' };
    if (data.email) return { label: 'Email', color: 'bg-yellow-600' };
    return null;
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-100 mb-2">
          Smart Recap: {lane.origin_city || '?'}, {lane.origin_state || '?'} → {lane.dest_city || '?'}, {lane.dest_state || '?'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Equipment:</span>
            <span className="text-gray-100 ml-2">{lane.equipment_code || '?'}</span>
          </div>
          <div>
            <span className="text-gray-400">Weight:</span>
            <span className="text-gray-100 ml-2">{lane.weight_lbs?.toLocaleString() || '?'} lbs</span>
          </div>
          <div>
            <span className="text-gray-400">Length:</span>
            <span className="text-gray-100 ml-2">{lane.length_ft || '?'}′</span>
          </div>
          <div>
            <span className="text-gray-400">Pickup:</span>
            <span className="text-gray-100 ml-2">{lane.pickup_earliest || '?'}</span>
          </div>
        </div>
      </div>

      {/* Posted Lanes Dropdown */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Select Posted Lane (what carrier called about):
        </label>
        <select
          value={selectedPosting?.id || ''}
          onChange={(e) => {
            const posting = postedPairs.find(p => p.id === e.target.value);
            setSelectedPosting(posting);
          }}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Choose posted lane...</option>
          {postedPairs.map((posting) => (
            <option key={posting.id} value={posting.id}>
              {posting.pickup.city}, {posting.pickup.state} → {posting.delivery.city}, {posting.delivery.state}
            </option>
          ))}
        </select>
      </div>

      {/* Selected Posting Details */}
      {selectedPosting && (
        <div className="bg-gray-900 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">Posted Lane Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pickup Details */}
            <div className="space-y-2">
              <h4 className="font-medium text-blue-400">Pickup Location</h4>
              <div className="text-gray-100">
                {selectedPosting.pickup.city}, {selectedPosting.pickup.state}
                {selectedPosting.pickup.zip && ` ${selectedPosting.pickup.zip}`}
              </div>
              {distances.pickup !== null && (
                <div className={`text-sm ${
                  distances.pickup <= 25 ? 'text-green-400' : 
                  distances.pickup <= 75 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  📍 {distances.pickup} miles from {lane.origin_city || '?'}
                  {distances.pickup <= 25 && ' (Great match!)'}
                  {distances.pickup > 75 && ' (Far match)'}
                </div>
              )}
            </div>

            {/* Delivery Details */}
            <div className="space-y-2">
              <h4 className="font-medium text-green-400">Delivery Location</h4>
              <div className="text-gray-100">
                {selectedPosting.delivery.city || '?'}, {selectedPosting.delivery.state || '?'}
                {selectedPosting.delivery.zip && ` ${selectedPosting.delivery.zip}`}
              </div>
              {distances.delivery !== null && (
                <div className={`text-sm ${
                  distances.delivery <= 25 ? 'text-green-400' : 
                  distances.delivery <= 75 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  📍 {distances.delivery} miles from {lane.dest_city || '?'}
                  {distances.delivery <= 25 && ' (Great match!)'}
                  {distances.delivery > 75 && ' (Far match)'}
                </div>
              )}
            </div>
          </div>

          {/* Tracking Buttons */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => handleTrackingUpdate(selectedPosting.id, 'email')}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium"
            >
              📧 Mark Email
            </button>
            <button
              onClick={() => handleTrackingUpdate(selectedPosting.id, 'call')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              📞 Mark Call
            </button>
            <button
              onClick={() => handleTrackingUpdate(selectedPosting.id, 'covered')}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
            >
              ✅ Mark Covered
            </button>
            
            {/* Status Display */}
            {(() => {
              const status = getTrackingStatus(selectedPosting.id);
              return status ? (
                <div className={`px-3 py-2 ${status.color} text-white rounded-lg text-sm font-medium`}>
                  {status.label}
                </div>
              ) : null;
            })()}
          </div>
        </div>
      )}

      {/* Performance Insights */}
      {Object.keys(trackingData).length > 0 && (
        <div className="bg-gray-900 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-100 mb-3">Performance Insights</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-yellow-400">
                {Object.values(trackingData).filter(d => d.email).length}
              </div>
              <div className="text-sm text-gray-400">Emails</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">
                {Object.values(trackingData).filter(d => d.call).length}
              </div>
              <div className="text-sm text-gray-400">Calls</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">
                {Object.values(trackingData).filter(d => d.covered).length}
              </div>
              <div className="text-sm text-gray-400">Covered</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartRecapCard;
