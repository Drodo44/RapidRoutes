// pages/admin/city-corrections.js
// Admin page to manage DAT city name corrections

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';

export default function CityCorrections() {
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCorrection, setNewCorrection] = useState({
    incorrect_city: '',
    incorrect_state: '',
    correct_city: '',
    correct_state: '',
    notes: ''
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCorrections();
  }, []);

  async function fetchCorrections() {
    setLoading(true);
    const { data, error } = await supabase
      .from('city_corrections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching corrections:', error);
      setMessage('Error loading corrections');
    } else {
      setCorrections(data || []);
    }
    setLoading(false);
  }

  async function addCorrection(e) {
    e.preventDefault();
    
    if (!newCorrection.incorrect_city || !newCorrection.incorrect_state || 
        !newCorrection.correct_city || !newCorrection.correct_state) {
      setMessage('❌ All city and state fields are required');
      return;
    }

    const { error } = await supabase
      .from('city_corrections')
      .insert({
        incorrect_city: newCorrection.incorrect_city.trim(),
        incorrect_state: newCorrection.incorrect_state.trim().toUpperCase(),
        correct_city: newCorrection.correct_city.trim(),
        correct_state: newCorrection.correct_state.trim().toUpperCase(),
        notes: newCorrection.notes.trim()
      });

    if (error) {
      console.error('Error adding correction:', error);
      setMessage('❌ Error: ' + error.message);
    } else {
      setMessage('✅ Correction added successfully!');
      setNewCorrection({
        incorrect_city: '',
        incorrect_state: '',
        correct_city: '',
        correct_state: '',
        notes: ''
      });
      fetchCorrections();
    }
  }

  async function deleteCorrection(id) {
    if (!confirm('Delete this correction?')) return;

    const { error } = await supabase
      .from('city_corrections')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting correction:', error);
      setMessage('❌ Error deleting correction');
    } else {
      setMessage('✅ Correction deleted');
      fetchCorrections();
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">DAT City Name Corrections</h1>
        <p className="text-gray-400 mb-6">
          Manage automatic corrections for cities rejected by DAT. 
          When a city is corrected here, it will automatically use the correct name in all future DAT exports.
        </p>

        {message && (
          <div className={`mb-4 p-3 rounded ${
            message.startsWith('✅') ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Add New Correction Form */}
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Add New Correction</h2>
          <form onSubmit={addCorrection} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Incorrect City Name (as in database)
                </label>
                <input
                  type="text"
                  value={newCorrection.incorrect_city}
                  onChange={(e) => setNewCorrection({ ...newCorrection, incorrect_city: e.target.value })}
                  placeholder="e.g., Sunny Side"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  State
                </label>
                <input
                  type="text"
                  value={newCorrection.incorrect_state}
                  onChange={(e) => setNewCorrection({ ...newCorrection, incorrect_state: e.target.value.toUpperCase() })}
                  placeholder="GA"
                  maxLength={2}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Correct City Name (DAT-accepted)
                </label>
                <input
                  type="text"
                  value={newCorrection.correct_city}
                  onChange={(e) => setNewCorrection({ ...newCorrection, correct_city: e.target.value })}
                  placeholder="e.g., Sunnyside"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  State
                </label>
                <input
                  type="text"
                  value={newCorrection.correct_state}
                  onChange={(e) => setNewCorrection({ ...newCorrection, correct_state: e.target.value.toUpperCase() })}
                  placeholder="GA"
                  maxLength={2}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notes (optional)
              </label>
              <input
                type="text"
                value={newCorrection.notes}
                onChange={(e) => setNewCorrection({ ...newCorrection, notes: e.target.value })}
                placeholder="e.g., DAT rejected with spacing error"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100"
              />
            </div>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium"
            >
              Add Correction
            </button>
          </form>
        </div>

        {/* Corrections List */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <h2 className="text-xl font-semibold p-6 border-b border-gray-700">
            Active Corrections ({corrections.length})
          </h2>
          
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading corrections...</div>
          ) : corrections.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No corrections yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Incorrect</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Correct</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Notes</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Added</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {corrections.map((correction) => (
                    <tr key={correction.id} className="hover:bg-gray-750">
                      <td className="px-6 py-4">
                        <div className="font-medium">{correction.incorrect_city}, {correction.incorrect_state}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-green-400">
                          {correction.correct_city}, {correction.correct_state}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {correction.notes || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(correction.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => deleteCorrection(correction.id)}
                          className="text-red-400 hover:text-red-300 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="font-semibold mb-2">How it works:</h3>
          <ul className="space-y-1 text-sm text-gray-400">
            <li>• When DAT rejects a city name, add it here with the correct spelling</li>
            <li>• The system will automatically use the correct name in all future DAT exports</li>
            <li>• Corrections are cached for 1 minute for performance</li>
            <li>• You can also check the legacy hardcoded corrections in the API code</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
