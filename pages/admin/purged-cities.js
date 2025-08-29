import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient.js';

export default function PurgedCitiesAdmin() {
  const [purgedCities, setPurgedCities] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [verificationStats, setVerificationStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters and pagination
  const [filters, setFilters] = useState({
    search: '',
    state: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    limit: 25,
    sortBy: 'purged_date',
    sortOrder: 'desc'
  });
  
  const [pagination, setPagination] = useState({});
  const [selectedCities, setSelectedCities] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [bulkResponse, setBulkResponse] = useState('');

  // Manual verification form
  const [verifyForm, setVerifyForm] = useState({
    city: '',
    state: '',
    zip: '',
    verifying: false
  });

  useEffect(() => {
    fetchData();
    fetchVerificationStats();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const response = await fetch(`/api/admin/purged-cities?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch purged cities');
      }
      
      const data = await response.json();
      setPurgedCities(data.cities || []);
      setStatistics(data.statistics);
      setPagination(data.pagination || {});
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchVerificationStats = async () => {
    try {
      const { data } = await supabase
        .from('verification_stats')
        .select('*')
        .single();
      
      setVerificationStats(data);
    } catch (err) {
      console.error('Failed to fetch verification stats:', err);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedCities.size === 0) {
      alert('Please select cities and an action');
      return;
    }

    try {
      const cityIds = Array.from(selectedCities);
      const response = await fetch('/api/admin/purged-cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: bulkAction,
          cityIds,
          status: bulkAction.includes('mark_') ? bulkAction.replace('mark_', '') : undefined,
          response: bulkResponse || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Bulk action failed');
      }

      const result = await response.json();
      alert(`Success: ${result.message}`);
      
      // Refresh data and clear selections
      fetchData();
      setSelectedCities(new Set());
      setBulkAction('');
      setBulkResponse('');
      
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleExport = async (format = 'csv') => {
    try {
      const response = await fetch(`/api/admin/export-purged-cities?status=${filters.status || 'pending'}&format=${format}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `purged-cities-${filters.status || 'pending'}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        console.log('Export data:', data);
      }
      
    } catch (err) {
      alert(`Export error: ${err.message}`);
    }
  };

  const handleManualVerify = async () => {
    if (!verifyForm.city || !verifyForm.state) {
      alert('City and state are required');
      return;
    }

    setVerifyForm(prev => ({ ...prev, verifying: true }));
    
    try {
      const response = await fetch('/api/admin/verify-city', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...verifyForm,
          updateDatabase: true,
          verifiedBy: 'admin'
        })
      });

      if (!response.ok) {
        throw new Error('Verification failed');
      }

      const result = await response.json();
      
      if (result.verification.verified) {
        alert(`✅ City verified successfully! Response time: ${result.verification.responseTime}ms`);
      } else {
        alert(`❌ City not found in HERE.com: ${result.verification.error || 'Unknown error'}`);
      }
      
      // Reset form
      setVerifyForm({ city: '', state: '', zip: '', verifying: false });
      
      // Refresh verification stats
      fetchVerificationStats();
      
    } catch (err) {
      alert(`Verification error: ${err.message}`);
      setVerifyForm(prev => ({ ...prev, verifying: false }));
    }
  };

  const handleRestore = async (purgedCityId) => {
    if (!confirm('Are you sure you want to restore this city to active cities?')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/restore-city', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purgedCityId,
          restoredBy: 'admin'
        })
      });

      if (!response.ok) {
        throw new Error('Restore failed');
      }

      alert('City restored successfully');
      fetchData();
      
    } catch (err) {
      alert(`Restore error: ${err.message}`);
    }
  };

  const toggleCitySelection = (cityId) => {
    const newSelection = new Set(selectedCities);
    if (newSelection.has(cityId)) {
      newSelection.delete(cityId);
    } else {
      newSelection.add(cityId);
    }
    setSelectedCities(newSelection);
  };

  const selectAllVisible = () => {
    const allVisible = new Set(purgedCities.map(city => city.id));
    setSelectedCities(allVisible);
  };

  const clearSelection = () => {
    setSelectedCities(new Set());
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">DAT City Verification & Purge Management</h1>
          <p className="text-gray-400">Manage cities purged from the system and track HERE.com verification status</p>
        </div>

        {/* Statistics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statistics && (
            <>
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-2">Total Purged</h3>
                <p className="text-3xl font-bold text-red-400">{statistics.total_purged}</p>
                <p className="text-sm text-gray-400 mt-1">{statistics.affected_states} states affected</p>
              </div>
              
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-2">Pending Submission</h3>
                <p className="text-3xl font-bold text-yellow-400">{statistics.pending_submission}</p>
                <p className="text-sm text-gray-400 mt-1">Ready for DAT</p>
              </div>
              
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-2">DAT Approved</h3>
                <p className="text-3xl font-bold text-green-400">{statistics.approved}</p>
                <p className="text-sm text-gray-400 mt-1">{statistics.rejected} rejected</p>
              </div>
              
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-2">This Month</h3>
                <p className="text-3xl font-bold text-blue-400">{statistics.purged_this_month}</p>
                <p className="text-sm text-gray-400 mt-1">{statistics.purged_this_week} this week</p>
              </div>
            </>
          )}
        </div>

        {/* Verification Statistics */}
        {verificationStats && (
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">HERE.com Verification Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-2xl font-bold text-green-400">{verificationStats.success_rate_percentage}%</p>
                <p className="text-sm text-gray-400">Success Rate</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-400">{verificationStats.total_verifications}</p>
                <p className="text-sm text-gray-400">Total Verifications</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-400">{verificationStats.verifications_last_24h}</p>
                <p className="text-sm text-gray-400">Last 24 Hours</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-400">{verificationStats.avg_response_time_ms}ms</p>
                <p className="text-sm text-gray-400">Avg Response Time</p>
              </div>
            </div>
          </div>
        )}

        {/* Manual City Verification */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Manual City Verification</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="City name"
              value={verifyForm.city}
              onChange={(e) => setVerifyForm(prev => ({ ...prev, city: e.target.value }))}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="State"
              value={verifyForm.state}
              onChange={(e) => setVerifyForm(prev => ({ ...prev, state: e.target.value }))}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="ZIP (optional)"
              value={verifyForm.zip}
              onChange={(e) => setVerifyForm(prev => ({ ...prev, zip: e.target.value }))}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleManualVerify}
              disabled={verifyForm.verifying}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-md font-medium transition-colors"
            >
              {verifyForm.verifying ? 'Verifying...' : 'Verify City'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <input
              type="text"
              placeholder="Search cities..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            
            <input
              type="text"
              placeholder="State"
              value={filters.state}
              onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value, page: 1 }))}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <input
              type="date"
              placeholder="From date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value, page: 1 }))}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <input
              type="date"
              placeholder="To date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value, page: 1 }))}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <button
              onClick={() => setFilters({
                search: '', state: '', status: '', dateFrom: '', dateTo: '',
                page: 1, limit: 25, sortBy: 'purged_date', sortOrder: 'desc'
              })}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md font-medium transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Bulk Actions ({selectedCities.size} selected)</h3>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex gap-2">
              <button
                onClick={selectAllVisible}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
              >
                Select All Visible
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md text-sm transition-colors"
              >
                Clear Selection
              </button>
            </div>
            
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Action</option>
              <option value="mark_submitted">Mark as Submitted to DAT</option>
              <option value="mark_approved">Mark as Approved by DAT</option>
              <option value="mark_rejected">Mark as Rejected by DAT</option>
            </select>
            
            {bulkAction && (
              <input
                type="text"
                placeholder="DAT response (optional)"
                value={bulkResponse}
                onChange={(e) => setBulkResponse(e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            
            <button
              onClick={handleBulkAction}
              disabled={!bulkAction || selectedCities.size === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-md font-medium transition-colors"
            >
              Apply Action
            </button>
            
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 p-4 rounded-lg mb-6">
            <p>Error: {error}</p>
          </div>
        )}

        {/* Cities Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedCities.size === purgedCities.length && purgedCities.length > 0}
                      onChange={selectedCities.size === purgedCities.length ? clearSelection : selectAllVisible}
                      className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">City</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">State</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">ZIP</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">KMA</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Purged Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Reason</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-8 text-center text-gray-400">Loading...</td>
                  </tr>
                ) : purgedCities.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-8 text-center text-gray-400">No purged cities found</td>
                  </tr>
                ) : (
                  purgedCities.map((city) => (
                    <tr key={city.id} className="hover:bg-gray-750">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedCities.has(city.id)}
                          onChange={() => toggleCitySelection(city.id)}
                          className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-white">{city.city}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{city.state_or_province}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{city.zip || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{city.original_kma_code || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {new Date(city.purged_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 max-w-xs truncate" title={city.purge_reason}>
                        {city.purge_reason}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          city.dat_submission_status === 'pending' ? 'bg-yellow-900 text-yellow-200' :
                          city.dat_submission_status === 'submitted' ? 'bg-blue-900 text-blue-200' :
                          city.dat_submission_status === 'approved' ? 'bg-green-900 text-green-200' :
                          city.dat_submission_status === 'rejected' ? 'bg-red-900 text-red-200' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {city.dat_submission_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleRestore(city.id)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors mr-2"
                        >
                          Restore
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, pagination.page - 1) }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800 text-white rounded text-sm transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: Math.min(pagination.totalPages, pagination.page + 1) }))}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800 text-white rounded text-sm transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
