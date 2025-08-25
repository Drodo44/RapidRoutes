// components/PreferredPickupsManager.js
// UI for managing broker's preferred pickup locations

import { useState, useEffect } from 'react';

export default function PreferredPickupsManager() {
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    city: '',
    state: '',
    zip: '',
    frequency_score: 5,
    equipment_preference: [],
    notes: ''
  });

  useEffect(() => {
    loadPickups();
  }, []);

  const loadPickups = async () => {
    try {
      const response = await fetch('/api/admin/preferred-pickups');
      const data = await response.json();
      setPickups(data);
    } catch (error) {
      console.error('Error loading preferred pickups:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPickup = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/preferred-pickups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        setFormData({
          city: '',
          state: '',
          zip: '',
          frequency_score: 5,
          equipment_preference: [],
          notes: ''
        });
        setShowAddForm(false);
        loadPickups();
      }
    } catch (error) {
      console.error('Error adding pickup:', error);
    }
  };

  const updateFrequency = async (id, newScore) => {
    try {
      const response = await fetch('/api/admin/preferred-pickups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, frequency_score: newScore })
      });
      
      if (response.ok) {
        loadPickups();
      }
    } catch (error) {
      console.error('Error updating frequency:', error);
    }
  };

  const deletePickup = async (id) => {
    if (confirm('Delete this preferred pickup location?')) {
      try {
        const response = await fetch(`/api/admin/preferred-pickups?id=${id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          loadPickups();
        }
      } catch (error) {
        console.error('Error deleting pickup:', error);
      }
    }
  };

  if (loading) {
    return <div className="p-4 text-gray-300">Loading preferred pickups...</div>;
  }

  return (
    <div className="p-6 bg-gray-800 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-100">
          Preferred Pickup Locations
          <span className="text-sm text-gray-400 ml-2">
            ({pickups.length} locations)
          </span>
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          {showAddForm ? 'Cancel' : 'Add Pickup'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={addPickup} className="mb-6 p-4 bg-gray-700 rounded">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-gray-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({...formData, state: e.target.value})}
                className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-gray-100"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">ZIP Code</label>
              <input
                type="text"
                value={formData.zip}
                onChange={(e) => setFormData({...formData, zip: e.target.value})}
                className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Frequency (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.frequency_score}
                onChange={(e) => setFormData({...formData, frequency_score: parseInt(e.target.value)})}
                className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-gray-100"
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-1">Notes</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="e.g., Major hub, high frequency loads"
              className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-gray-100"
            />
          </div>
          
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
          >
            Add Pickup Location
          </button>
        </form>
      )}

      <div className="space-y-3">
        {pickups.map((pickup) => (
          <div key={pickup.id} className="flex items-center justify-between p-4 bg-gray-700 rounded">
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <h3 className="font-medium text-gray-100">
                  {pickup.city}, {pickup.state_or_province}
                </h3>
                {pickup.zip && (
                  <span className="text-sm text-gray-400">{pickup.zip}</span>
                )}
                {pickup.kma_code && (
                  <span className="px-2 py-1 bg-blue-600 text-xs rounded">
                    KMA: {pickup.kma_code}
                  </span>
                )}
              </div>
              {pickup.notes && (
                <p className="text-sm text-gray-400 mt-1">{pickup.notes}</p>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <span className="text-sm text-gray-400">Freq:</span>
                <select
                  value={pickup.frequency_score}
                  onChange={(e) => updateFrequency(pickup.id, parseInt(e.target.value))}
                  className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm text-gray-100"
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={() => deletePickup(pickup.id)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {pickups.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No preferred pickup locations configured.
          <br />
          Add your most common pickup cities to optimize posting intelligence.
        </div>
      )}
    </div>
  );
}
