// pages/settings.js
import { useState, useEffect } from "react";
import Head from "next/head";
import { Card, Button, Spinner } from "../components/EnterpriseUI";
import DatMarketMaps from "../components/DatMarketMaps";
import supabase from '../utils/supabaseClient';

export default function Settings() {
  const [notification, setNotification] = useState(false);
  const [blacklist, setBlacklist] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCorrections, setLoadingCorrections] = useState(true);
  const [adding, setAdding] = useState(false);
  const [addingCorrection, setAddingCorrection] = useState(false);
  const [newCity, setNewCity] = useState({ city: '', state: '', reason: '' });
  const [newCorrection, setNewCorrection] = useState({
    incorrect_city: '',
    incorrect_state: '',
    correct_city: '',
    correct_state: '',
    notes: ''
  });
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchBlacklist();
    fetchCorrections();
  }, []);

  const fetchBlacklist = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/blacklist');
      const data = await response.json();
      setBlacklist(data.blacklist || []);
    } catch (error) {
      console.error('Failed to fetch blacklist:', error);
      showMessage('Failed to load blacklist', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCorrections = async () => {
    try {
      setLoadingCorrections(true);
      const response = await fetch('/api/corrections');
      const data = await response.json();
      setCorrections(data.corrections || []);
    } catch (error) {
      console.error('Failed to fetch corrections:', error);
      showMessage('Failed to load corrections', 'error');
    } finally {
      setLoadingCorrections(false);
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAddCity = async (e) => {
    e.preventDefault();
    if (!newCity.city.trim() || !newCity.state.trim()) {
      showMessage('City and state are required', 'error');
      return;
    }

    try {
      setAdding(true);
      const response = await fetch('/api/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCity)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add city');
      }

      showMessage('City blacklisted successfully', 'success');
      setNewCity({ city: '', state: '', reason: '' });
      fetchBlacklist();
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveCity = async (id) => {
    if (!confirm('Remove this city from blacklist?')) return;

    try {
      const response = await fetch(`/api/blacklist?id=${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to remove city');
      }

      showMessage('City removed from blacklist', 'success');
      fetchBlacklist();
    } catch (error) {
      showMessage(error.message, 'error');
    }
  };

  const handleAddCorrection = async (e) => {
    e.preventDefault();
    if (!newCorrection.incorrect_city.trim() || !newCorrection.incorrect_state.trim() ||
      !newCorrection.correct_city.trim() || !newCorrection.correct_state.trim()) {
      showMessage('All city and state fields are required', 'error');
      return;
    }

    try {
      setAddingCorrection(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('You must be logged in to add corrections');
      }

      const response = await fetch('/api/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCorrection,
          userId: session.user.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add correction');
      }

      showMessage('City correction added successfully', 'success');
      setNewCorrection({
        incorrect_city: '',
        incorrect_state: '',
        correct_city: '',
        correct_state: '',
        notes: ''
      });
      fetchCorrections();
    } catch (error) {
      showMessage(error.message, 'error');
    } finally {
      setAddingCorrection(false);
    }
  };

  const handleRemoveCorrection = async (id) => {
    if (!confirm('Remove this correction?')) return;

    try {
      const response = await fetch(`/api/corrections?id=${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to remove correction');
      }

      showMessage('Correction removed successfully', 'success');
      fetchCorrections();
    } catch (error) {
      showMessage(error.message, 'error');
    }
  };

  return (
    <>
      <Head>
        <title>Settings | RapidRoutes</title>
      </Head>

      <div className="min-h-screen bg-slate-950 text-gray-100 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="page-header">
            <h1 className="text-3xl font-bold text-gray-100">Settings</h1>
            <p className="text-gray-400">Manage application settings and preferences</p>
          </div>

          {message && (
            <div className={`p-4 rounded-lg border ${message.type === 'error'
              ? 'bg-red-900/20 border-red-700 text-red-200'
              : 'bg-green-900/20 border-green-700 text-green-200'
              }`}>
              {message.text}
            </div>
          )}

          {/* Blacklist Management */}
          <Card className="p-6">
            <div className="border-b border-gray-700 pb-4 mb-6">
              <h2 className="text-xl font-semibold text-gray-100">City Blacklist</h2>
              <p className="text-sm text-gray-400 mt-1">
                Cities in the blacklist won't appear in post options or DAT exports
              </p>
            </div>

            {/* Add City Form */}
            <form onSubmit={handleAddCity} className="mb-6 p-4 bg-gray-800/50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Add City to Blacklist</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="City name"
                  value={newCity.city}
                  onChange={(e) => setNewCity({ ...newCity, city: e.target.value })}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
                <input
                  type="text"
                  placeholder="State (e.g., OH)"
                  value={newCity.state}
                  onChange={(e) => setNewCity({ ...newCity, state: e.target.value.toUpperCase() })}
                  maxLength={2}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Reason (optional)"
                  value={newCity.reason}
                  onChange={(e) => setNewCity({ ...newCity, reason: e.target.value })}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <Button
                  type="submit"
                  variant="primary"
                  disabled={adding}
                  className="w-full"
                >
                  {adding ? 'Adding...' : 'Add to Blacklist'}
                </Button>
              </div>
            </form>

            {/* Blacklist Table */}
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : blacklist.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No cities blacklisted yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-800/60">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                        City
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                        State
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Reason
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Added
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {blacklist.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-800/40">
                        <td className="px-4 py-3 text-sm font-medium text-gray-100">
                          {item.city}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          {item.state}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {item.reason || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {new Date(item.blacklisted_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          <button
                            onClick={() => handleRemoveCity(item.id)}
                            className="text-red-400 hover:text-red-300 font-medium"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* City Corrections Management */}
          <Card className="p-6">
            <div className="border-b border-gray-700 pb-4 mb-6">
              <h2 className="text-xl font-semibold text-gray-100">City Name Corrector</h2>
              <p className="text-sm text-gray-400 mt-1">
                Automatically correct city names during import or entry (e.g., "St. Louis" → "Saint Louis")
              </p>
            </div>

            {/* Add Correction Form */}
            <form onSubmit={handleAddCorrection} className="mb-6 p-4 bg-gray-800/50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Add New Correction</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 uppercase font-semibold">Incorrect (Input)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="City"
                      value={newCorrection.incorrect_city}
                      onChange={(e) => setNewCorrection({ ...newCorrection, incorrect_city: e.target.value })}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={newCorrection.incorrect_state}
                      onChange={(e) => setNewCorrection({ ...newCorrection, incorrect_state: e.target.value.toUpperCase() })}
                      maxLength={2}
                      className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 uppercase font-semibold">Correct (Output)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="City"
                      value={newCorrection.correct_city}
                      onChange={(e) => setNewCorrection({ ...newCorrection, correct_city: e.target.value })}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={newCorrection.correct_state}
                      onChange={(e) => setNewCorrection({ ...newCorrection, correct_state: e.target.value.toUpperCase() })}
                      maxLength={2}
                      className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Notes (optional)"
                  value={newCorrection.notes}
                  onChange={(e) => setNewCorrection({ ...newCorrection, notes: e.target.value })}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <Button
                  type="submit"
                  variant="primary"
                  disabled={addingCorrection}
                  className="w-32"
                >
                  {addingCorrection ? 'Adding...' : 'Add Rule'}
                </Button>
              </div>
            </form>

            {/* Corrections Table */}
            {loadingCorrections ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : corrections.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No corrections defined yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-800/60">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Incorrect Input
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Correct Output
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Notes
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {corrections.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-800/40">
                        <td className="px-4 py-3 text-sm text-red-300">
                          {item.incorrect_city}, {item.incorrect_state}
                        </td>
                        <td className="px-4 py-3 text-sm text-green-300">
                          {item.correct_city}, {item.correct_state}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {item.notes || '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          <button
                            onClick={() => handleRemoveCorrection(item.id)}
                            className="text-red-400 hover:text-red-300 font-medium"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Weekly Market Data Upload */}
          <Card className="p-6">
            <div className="border-b border-gray-700 pb-4 mb-6">
              <h2 className="text-xl font-semibold text-gray-100">📊 Weekly Market Data</h2>
              <p className="text-sm text-gray-400 mt-1">
                Upload DAT heat maps for Van, Reefer, and Flatbed to display on the Dashboard
              </p>
            </div>
            <DatMarketMaps />
          </Card>

          {/* Notification Settings */}
          <Card className="p-6">
            <div className="border-b border-gray-700 pb-4 mb-6">
              <h2 className="text-xl font-semibold text-gray-100">Notification Preferences</h2>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                id="notif-toggle"
                type="checkbox"
                checked={notification}
                onChange={() => setNotification(!notification)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="text-sm font-medium text-gray-100">Email Notifications</div>
                <div className="text-xs text-gray-400 mt-1">
                  Receive email updates about your lanes and loads
                </div>
              </div>
            </label>

            <div className="border-t border-gray-700 pt-6 mt-6">
              <Button
                onClick={() => showMessage('Settings saved!')}
                variant="primary"
              >
                Save Settings
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}