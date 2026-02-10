// components/analytics/AnalyticsDashboard.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../post-options/Toast';
import AnalyticsTable from './AnalyticsTable';
import AnalyticsChart from './AnalyticsChart';

/**
 * Main analytics dashboard component with metrics, charts and tables
 */
export default function AnalyticsDashboard() {
  const INSUFFICIENT_DATA_LABEL = 'Insufficient data';

  // State for analytics data
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalLanes: 0,
    activeLanes: 0,
    avgDistance: null,
    quoteAccuracy: null,
    successfulPosts: null
  });
  const [insufficientData, setInsufficientData] = useState({
    avgDistance: true,
    quoteAccuracy: false,
    successfulPosts: false,
    kmaDistribution: false,
    equipmentDistribution: false,
    recentLanes: false
  });
  const [kmaDistribution, setKmaDistribution] = useState([]);
  const [equipmentDistribution, setEquipmentDistribution] = useState([]);
  const [recentLanes, setRecentLanes] = useState([]);
  const refreshInterval = 60; // seconds
  
  // Use toast for notifications
  const { showToast, ToastComponent } = useToast();

  const isMissingSchemaError = (error) => {
    const message = String(error?.message || error?.details || '').toLowerCase();
    return (
      message.includes('does not exist') ||
      message.includes('not found') ||
      message.includes('undefined column')
    );
  };

  const normalizeLaneStatus = (lane) => {
    const rawStatus = lane?.lane_status ?? lane?.status;
    if (rawStatus == null || rawStatus === '') return 'current';
    return String(rawStatus).trim().toLowerCase();
  };

  const resolveOrganizationScope = async () => {
    if (!supabase) {
      throw new Error('Supabase client unavailable');
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const user = session?.user;
    if (!user) {
      throw new Error('Authentication required');
    }

    let organizationId =
      user?.user_metadata?.organization_id ||
      user?.app_metadata?.organization_id ||
      null;

    if (!organizationId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();
      if (profileError) {
        throw new Error(`Unable to resolve organization scope: ${profileError.message}`);
      }
      organizationId = profile?.organization_id || null;
    }

    if (!organizationId) {
      throw new Error('Organization scope unavailable for analytics.');
    }

    return { organizationId };
  };
  
  // Function to fetch analytics data
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      const { organizationId } = await resolveOrganizationScope();

      // Fetch org-scoped lane dataset for core metrics/charts.
      const { data: laneMetricsRows, error: laneMetricsError } = await supabase
        .from('lanes')
        .select('id, lane_status, status, equipment_code, origin_city, origin_state')
        .eq('organization_id', organizationId);
      if (laneMetricsError) throw laneMetricsError;

      const scopedLanes = laneMetricsRows || [];
      const totalLanes = scopedLanes.length;
      const activeLanes = scopedLanes.filter((lane) => normalizeLaneStatus(lane) === 'current').length;

      // Quote accuracy: org scoped, no synthetic fallback.
      let quoteAccuracy = null;
      let quoteAccuracyInsufficient = false;
      try {
        const { data: quoteData, error: quoteError } = await supabase
          .from('lane_rates')
          .select('rate_accuracy')
          .eq('organization_id', organizationId);
        if (quoteError) {
          if (isMissingSchemaError(quoteError)) {
            quoteAccuracyInsufficient = true;
          } else {
            throw quoteError;
          }
        } else {
          const numericRates = (quoteData || [])
            .map((item) => Number(item.rate_accuracy))
            .filter((value) => Number.isFinite(value));

          if (numericRates.length > 0) {
            quoteAccuracy = Math.round(
              (numericRates.reduce((sum, value) => sum + value, 0) / numericRates.length) * 100
            );
          } else {
            quoteAccuracyInsufficient = true;
          }
        }
      } catch (error) {
        if (isMissingSchemaError(error)) {
          quoteAccuracyInsufficient = true;
        } else {
          throw error;
        }
      }
      
      // Successful post rate: org scoped, no synthetic fallback.
      let successfulPosts = null;
      let successfulPostsInsufficient = false;
      try {
        const { data: postData, error: postError } = await supabase
          .from('post_attempts')
          .select('success')
          .eq('organization_id', organizationId);
        if (postError) {
          if (isMissingSchemaError(postError)) {
            successfulPostsInsufficient = true;
          } else {
            throw postError;
          }
        } else {
          if ((postData || []).length > 0) {
            const successfulCount = (postData || []).filter((post) => !!post.success).length;
            successfulPosts = Math.round((successfulCount / (postData || []).length) * 100);
          } else {
            successfulPostsInsufficient = true;
          }
        }
      } catch (error) {
        if (isMissingSchemaError(error)) {
          successfulPostsInsufficient = true;
        } else {
          throw error;
        }
      }
      
      // Update summary metrics (distance is not available in canonical scoped tables).
      setMetrics({
        totalLanes,
        activeLanes,
        avgDistance: null,
        quoteAccuracy,
        successfulPosts
      });
      
      // KMA distribution (org-scoped approximation from origin city/state frequency).
      const marketCounts = {};
      scopedLanes.forEach((lane) => {
        const city = String(lane.origin_city || '').trim();
        const state = String(lane.origin_state || '').trim();
        if (!city || !state) return;
        const key = `${city}, ${state}`;
        marketCounts[key] = (marketCounts[key] || 0) + 1;
      });
      const kmaData = Object.entries(marketCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
      setKmaDistribution(kmaData);

      // Equipment distribution (org-scoped, active lanes only).
      const equipmentCounts = {};
      scopedLanes
        .filter((lane) => normalizeLaneStatus(lane) === 'current')
        .forEach((lane) => {
        const code = lane.equipment_code || 'Unknown';
        equipmentCounts[code] = (equipmentCounts[code] || 0) + 1;
      });
      
      const equipmentArray = Object.entries(equipmentCounts).map(([code, count]) => ({
        name: code,
        value: count
      }));
      
      setEquipmentDistribution(equipmentArray);
      
      // Fetch recent lanes for table (org-scoped).
      const { data: lanesData, error: lanesError } = await supabase
        .from('lanes')
        .select('id, origin_city, origin_state, dest_city, dest_state, equipment_code, length_ft, weight_lbs, lane_status, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (lanesError) throw lanesError;
      
      setRecentLanes(lanesData || []);

      const nextInsufficientState = {
        avgDistance: true,
        quoteAccuracy: quoteAccuracyInsufficient,
        successfulPosts: successfulPostsInsufficient,
        kmaDistribution: kmaData.length === 0,
        equipmentDistribution: equipmentArray.length === 0,
        recentLanes: (lanesData || []).length === 0
      };
      setInsufficientData(nextInsufficientState);

      const missingCount = Object.values(nextInsufficientState).filter(Boolean).length;
      
      showToast({
        message: missingCount > 0
          ? 'Analytics refreshed with insufficient data on some metrics'
          : 'Analytics data refreshed',
        type: missingCount > 0 ? 'warning' : 'success',
        duration: 3000
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      showToast({
        message: `Error refreshing data: ${error.message}`,
        type: 'error',
        duration: 6000
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Initial data load and refresh timer
  useEffect(() => {
    fetchAnalyticsData();
    
    // Set up refresh interval
    const intervalId = setInterval(fetchAnalyticsData, refreshInterval * 1000);
    
    return () => clearInterval(intervalId);
  }, [refreshInterval]);
  
  // Handle manual refresh
  const handleRefresh = () => {
    fetchAnalyticsData();
  };
  
  // Handle export data
  const handleExportData = () => {
    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        metrics,
        kmaDistribution,
        equipmentDistribution,
        recentLanes: recentLanes.slice(0, 10) // Only include first 10 lanes in export
      };
      
      // Create blob and download link
      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `rapidroutes-analytics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast({
        message: 'Analytics data exported successfully',
        type: 'success',
        duration: 3000
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      showToast({
        message: `Export failed: ${error.message}`,
        type: 'error',
        duration: 6000
      });
    }
  };
  
  // Table columns configuration
  const laneColumns = [
    { field: 'origin_city', header: 'Origin', type: 'text' },
    { field: 'origin_state', header: 'State', type: 'text' },
    { field: 'dest_city', header: 'Destination', type: 'text' },
    { field: 'dest_state', header: 'State', type: 'text' },
    { field: 'equipment_code', header: 'Equipment', type: 'text' },
    { field: 'weight_lbs', header: 'Weight', type: 'number', format: (v) => `${v?.toLocaleString() || 0} lbs` },
    { field: 'lane_status', header: 'Status', type: 'status' },
    { field: 'created_at', header: 'Created', type: 'date' },
  ];

  // Render refresh countdown timer
  const RefreshTimer = () => {
    const [countdown, setCountdown] = useState(refreshInterval);
    
    useEffect(() => {
      const timer = setInterval(() => {
        setCountdown(prev => (prev > 0 ? prev - 1 : refreshInterval));
      }, 1000);
      
      return () => clearInterval(timer);
    }, []);
    
    return (
      <span className="text-xs text-gray-400">
        Next refresh in {countdown}s
      </span>
    );
  };

  const quoteAccuracyValue = metrics.quoteAccuracy == null
    ? INSUFFICIENT_DATA_LABEL
    : `${metrics.quoteAccuracy}%`;
  const successfulPostsValue = metrics.successfulPosts == null
    ? INSUFFICIENT_DATA_LABEL
    : `${metrics.successfulPosts}%`;
  const avgDistanceValue = metrics.avgDistance == null
    ? INSUFFICIENT_DATA_LABEL
    : `${metrics.avgDistance} mi`;

  return (
    <div className="bg-gray-900 text-gray-100">
      {/* Toast notification component */}
      {ToastComponent}
      
      {/* Dashboard header */}
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-100">RapidRoutes Analytics</h2>
        <div className="flex items-center gap-2">
          <RefreshTimer />
          <button
            onClick={handleRefresh}
            disabled={loading}
            className={`px-3 py-1 rounded text-sm ${
              loading
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {loading ? 'Refreshing...' : 'Refresh Now'}
          </button>
          <button
            onClick={handleExportData}
            disabled={loading}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-sm"
          >
            Export JSON
          </button>
        </div>
      </div>
      
      {/* Summary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <MetricCard
          title="Total Lanes"
          value={metrics.totalLanes}
          loading={loading}
          icon={
            <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          }
        />
        <MetricCard
          title="Active Lanes"
          value={metrics.activeLanes}
          loading={loading}
          icon={
            <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          title="Avg Distance"
          value={avgDistanceValue}
          loading={loading}
          helperText={insufficientData.avgDistance ? 'Insufficient data in current schema.' : ''}
          icon={
            <svg className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <MetricCard
          title="Quote Accuracy"
          value={quoteAccuracyValue}
          loading={loading}
          helperText={insufficientData.quoteAccuracy ? 'Insufficient data for this organization.' : ''}
          icon={
            <svg className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          title="Post Success Rate"
          value={successfulPostsValue}
          loading={loading}
          helperText={insufficientData.successfulPosts ? 'Insufficient data for this organization.' : ''}
          icon={
            <svg className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          }
        />
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <AnalyticsChart
            title="KMA Distribution"
            data={kmaDistribution}
            type="bar"
            xKey="name"
            yKeys={['value']}
            labels={['Lanes']}
            loading={loading}
          />
          {!loading && insufficientData.kmaDistribution && (
            <p className="mt-2 text-xs text-amber-300">Insufficient data for KMA distribution in this organization.</p>
          )}
        </div>
        <div>
          <AnalyticsChart
            title="Equipment Distribution"
            data={equipmentDistribution}
            type="pie"
            xKey="name"
            yKeys={['value']}
            labels={['Count']}
            loading={loading}
          />
          {!loading && insufficientData.equipmentDistribution && (
            <p className="mt-2 text-xs text-amber-300">Insufficient data for equipment distribution in this organization.</p>
          )}
        </div>
      </div>
      
      {/* Lanes Table */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Recent Lanes</h3>
        {!loading && insufficientData.recentLanes && (
          <p className="mb-2 text-xs text-amber-300">Insufficient data: no recent lanes found for this organization.</p>
        )}
        <AnalyticsTable
          data={recentLanes}
          columns={laneColumns}
          loading={loading}
          defaultSortField="created_at"
          defaultSortAsc={false}
        />
      </div>
    </div>
  );
}

/**
 * Metric card component for summary stats
 */
function MetricCard({ title, value, loading = false, icon = null, helperText = '' }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        {icon}
      </div>
      <div className="mt-2">
        {loading ? (
          <div className="h-6 w-16 bg-gray-700 rounded animate-pulse"></div>
        ) : (
          <>
            <p className={`text-2xl font-bold ${value === 'Insufficient data' ? 'text-amber-300' : 'text-gray-100'}`}>{value}</p>
            {helperText ? <p className="mt-1 text-[11px] text-gray-400">{helperText}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}
