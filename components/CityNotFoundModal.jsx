// components/CityNotFoundModal.js
// Modal for adding missing cities to the database

import { useState, useEffect } from 'react';

const CityNotFoundModal = ({ isOpen, onClose, city, state, onCityAdded }) => {
  const [formData, setFormData] = useState({
    city: '',
    state: '',
    zip: '',
    kmaCode: ''
  });
  const [kmaOptions, setKmaOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && city && state) {
      setFormData({
        city: city,
        state: state,
        zip: '',
        kmaCode: ''
      });
      fetchKmaOptions(state);
    }
  }, [isOpen, city, state]);

  const fetchKmaOptions = async (stateCode) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/kmaOptions?state=${stateCode}`);
      if (response.ok) {
        const data = await response.json();
        setKmaOptions(data);
      }
    } catch (error) {
      console.error('Error fetching KMA options:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    console.log('🏙️ [CityModal] Submitting city:', formData);
    
    try {
      const response = await fetch('/api/addCity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      console.log('🏙️ [CityModal] Response status:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('🏙️ [CityModal] City added successfully:', result);
        onCityAdded(result.city);
        onClose();
        setFormData({ city: '', state: '', zip: '', kmaCode: '' });
        alert('✅ City added successfully! You can now use it in your lane.');
      } else {
        const error = await response.json();
        console.error('🏙️ [CityModal] API error:', error);
        alert(`Error adding city: ${error.error || error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('🏙️ [CityModal] Exception:', error);
      alert('Failed to add city. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-100">City Not Found</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        <p className="text-gray-300 mb-4">
          <strong>{city}, {state}</strong> was not found in our database. 
          Please provide the following information to add it:
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              City Name *
            </label>
            <input
              type="text"
              required
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              State *
            </label>
            <input
              type="text"
              required
              maxLength="2"
              value={formData.state}
              onChange={(e) => {
                const newState = e.target.value.toUpperCase();
                setFormData({ ...formData, state: newState });
                if (newState.length === 2) {
                  fetchKmaOptions(newState);
                }
              }}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., NJ"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              ZIP Code
            </label>
            <input
              type="text"
              value={formData.zip}
              onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., 08009"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              DAT KMA Market *
            </label>
            {loading ? (
              <div className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-400">
                Loading KMA options...
              </div>
            ) : (
              <select
                required
                value={formData.kmaCode}
                onChange={(e) => setFormData({ ...formData, kmaCode: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select KMA Market</option>
                {kmaOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.code} - {option.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.city || !formData.state || !formData.kmaCode}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded font-medium"
            >
              {submitting ? 'Adding...' : 'Add City'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CityNotFoundModal;
