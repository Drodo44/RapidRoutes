// pages/admin/city-manager.js
// Admin tool to add missing cities with SQL generation

import { useState } from 'react';
// IMPORTANT: Do NOT import adminSupabase in a client bundle. Use API route for writes.
import supabase from '../../utils/supabaseClient';

export default function CityManager() {
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [kmaCode, setKmaCode] = useState('');
  const [kmaName, setKmaName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [generatedSql, setGeneratedSql] = useState('');
  const [message, setMessage] = useState('');

  // Auto-lookup coordinates from ZIP code
  async function lookupCoordinates() {
    if (!zip) {
      setMessage('Enter a ZIP code first');
      return;
    }

    try {
      // Use a geocoding service to get lat/long from ZIP
      const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
      if (response.ok) {
        const data = await response.json();
        setLatitude(data.places[0].latitude);
        setLongitude(data.places[0].longitude);
        if (!city) setCity(data.places[0]['place name']);
        if (!state) setState(data.places[0]['state abbreviation']);
        setMessage('✅ Coordinates auto-filled from ZIP code');
      } else {
        setMessage('❌ Could not find coordinates for this ZIP code');
      }
    } catch (error) {
      setMessage('❌ Error looking up coordinates: ' + error.message);
    }
  }

  function generateSql() {
    if (!city || !state) {
      setMessage('❌ Please enter at least city and state');
      return;
    }

    // SECURITY: Use parameterized SQL to prevent injection
    const sql = `-- Add city to database (Use parameterized queries in Supabase SQL editor)
-- IMPORTANT: Replace $1, $2, etc. with actual values in Supabase SQL editor
INSERT INTO cities (city, state_or_province, zip, latitude, longitude, kma_code, kma_name) VALUES
  ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (city, state_or_province, zip) DO NOTHING;

-- Parameters to use:
-- $1 = '${city.replace(/'/g, "''")}'
-- $2 = '${state.replace(/'/g, "''")}'
-- $3 = '${zip || ''}'
-- $4 = ${latitude || 'NULL'}
-- $5 = ${longitude || 'NULL'}
-- $6 = '${(kmaCode || 'UNK').replace(/'/g, "''")}'
-- $7 = '${(kmaName || 'Unknown Market').replace(/'/g, "''")}'

-- Verify it was added
SELECT * FROM cities WHERE city = $1 AND state_or_province = $2;`;

    setGeneratedSql(sql);
    setMessage('✅ SQL generated! Copy and paste into Supabase SQL editor.');
  }

  async function executeDirectly() {
    if (!city || !state || !zip || !latitude || !longitude) {
      setMessage('❌ Please fill in all required fields first');
      return;
    }
    try {
      const resp = await fetch('/api/admin/add-city', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          state,
          zip,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          kma_code: kmaCode || 'UNK',
          kma_name: kmaName || 'Unknown Market'
        })
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Request failed');
      }
      setMessage('✅ City added via API!');
      setCity(''); setState(''); setZip(''); setLatitude(''); setLongitude('');
      setKmaCode(''); setKmaName('');
    } catch (error) {
      setMessage('❌ Error adding city: ' + error.message);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-400 mb-8">🏛️ Admin: City Database Manager</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-6">Add Missing City</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">City *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="New Bedford"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">State *</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="MA"
                maxLength="2"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">ZIP Code *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="02745"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100"
                />
                <button
                  onClick={lookupCoordinates}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md whitespace-nowrap"
                >
                  Lookup Coords
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">KMA Code</label>
              <input
                type="text"
                value={kmaCode}
                onChange={(e) => setKmaCode(e.target.value)}
                placeholder="BOS"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Latitude *</label>
              <input
                type="number"
                step="0.0001"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="41.6362"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Longitude *</label>
              <input
                type="number"
                step="0.0001"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="-70.9342"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">KMA Name</label>
              <input
                type="text"
                value={kmaName}
                onChange={(e) => setKmaName(e.target.value)}
                placeholder="Boston Market"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100"
              />
            </div>
          </div>
          
          <div className="flex gap-4 mb-4">
            <button
              onClick={generateSql}
              className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md font-medium"
            >
              📝 Generate SQL
            </button>
            
            <button
              onClick={executeDirectly}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium"
            >
              ⚡ Add Directly
            </button>
          </div>
          
          {message && (
            <div className={`p-3 rounded-md mb-4 ${
              message.includes('✅') ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
            }`}>
              {message}
            </div>
          )}
          
          {generatedSql && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Generated SQL:</h3>
              <textarea
                value={generatedSql}
                readOnly
                rows={8}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 font-mono text-sm"
              />
              <button
                onClick={() => navigator.clipboard.writeText(generatedSql)}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                📋 Copy SQL
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
