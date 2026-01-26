import { useEffect, useState } from 'react';
import Head from 'next/head';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filters, setFilters] = useState({
    days: 7,
    model: '',
    route: ''
  });

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - filters.days);
        params.append('startDate', startDate.toISOString().split('T')[0]);
      }
      if (filters.model) params.append('model', filters.model);
      if (filters.route) params.append('route', filters.route);

      const response = await fetch(`/api/ai/analytics?${params}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      
      const data = await response.json();
      setAnalytics(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchAnalytics();
    
    if (autoRefresh) {
      const interval = setInterval(fetchAnalytics, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, filters]);

  // Get severity icon and color
  const getSeverityDisplay = (severity) => {
    switch (severity) {
      case 'critical':
        return { icon: '🔴', color: 'text-red-400', bg: 'bg-red-900/20' };
      case 'high':
        return { icon: '🔴', color: 'text-red-400', bg: 'bg-red-900/20' };
      case 'medium':
        return { icon: '⚠️', color: 'text-yellow-400', bg: 'bg-yellow-900/20' };
      case 'low':
        return { icon: '✅', color: 'text-green-400', bg: 'bg-green-900/20' };
      default:
        return { icon: 'ℹ️', color: 'text-blue-400', bg: 'bg-blue-900/20' };
    }
  };

  // Prepare chart data
  const prepareChartData = () => {
    if (!analytics?.modelStats) return null;

    const models = Object.entries(analytics.modelStats);
    
    // Model usage chart
    const usageData = {
      labels: models.map(([name]) => name),
      datasets: [{
        label: 'Usage Count',
        data: models.map(([, stats]) => stats.usageCount),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',   // blue
          'rgba(168, 85, 247, 0.8)',   // purple
          'rgba(236, 72, 153, 0.8)',   // pink
          'rgba(34, 197, 94, 0.8)',    // green
          'rgba(251, 146, 60, 0.8)',   // orange
          'rgba(14, 165, 233, 0.8)',   // cyan
          'rgba(244, 63, 94, 0.8)',    // rose
        ],
        borderColor: 'rgba(75, 85, 99, 0.5)',
        borderWidth: 1
      }]
    };

    // Success rate chart
    const successData = {
      labels: models.map(([name]) => name),
      datasets: [{
        label: 'Success Rate (%)',
        data: models.map(([, stats]) => stats.successRate || 0),
        backgroundColor: models.map(([, stats]) => {
          const rate = stats.successRate || 0;
          if (rate >= 90) return 'rgba(34, 197, 94, 0.8)';   // green
          if (rate >= 75) return 'rgba(251, 146, 60, 0.8)';  // orange
          return 'rgba(239, 68, 68, 0.8)';                   // red
        }),
        borderColor: 'rgba(75, 85, 99, 0.5)',
        borderWidth: 1
      }]
    };

    // Latency chart
    const latencyData = {
      labels: models.map(([name]) => name),
      datasets: [{
        label: 'Avg Latency (ms)',
        data: models.map(([, stats]) => stats.avgLatency || 0),
        backgroundColor: 'rgba(168, 85, 247, 0.8)',
        borderColor: 'rgba(75, 85, 99, 0.5)',
        borderWidth: 1
      }]
    };

    // Token usage chart (Doughnut)
    const tokenData = {
      labels: models.map(([name]) => name),
      datasets: [{
        label: 'Total Tokens',
        data: models.map(([, stats]) => stats.totalTokens || 0),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(14, 165, 233, 0.8)',
          'rgba(244, 63, 94, 0.8)',
        ],
        borderColor: 'rgba(31, 41, 55, 1)',
        borderWidth: 2
      }]
    };

    // Confidence distribution
    const confidenceData = {
      labels: ['0.0-0.3', '0.3-0.5', '0.5-0.7', '0.7-0.9', '0.9-1.0'],
      datasets: [{
        label: 'Decision Count',
        data: [
          analytics.confidenceDistribution?.['0.0-0.3'] || 0,
          analytics.confidenceDistribution?.['0.3-0.5'] || 0,
          analytics.confidenceDistribution?.['0.5-0.7'] || 0,
          analytics.confidenceDistribution?.['0.7-0.9'] || 0,
          analytics.confidenceDistribution?.['0.9-1.0'] || 0,
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',    // red (low)
          'rgba(251, 146, 60, 0.8)',   // orange
          'rgba(234, 179, 8, 0.8)',    // yellow
          'rgba(132, 204, 22, 0.8)',   // lime
          'rgba(34, 197, 94, 0.8)',    // green (high)
        ],
        borderColor: 'rgba(75, 85, 99, 0.5)',
        borderWidth: 1
      }]
    };

    return { usageData, successData, latencyData, tokenData, confidenceData };
  };

  const chartData = prepareChartData();

  // Chart options
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: 'rgba(243, 244, 246, 1)',
        bodyColor: 'rgba(229, 231, 235, 1)',
        borderColor: 'rgba(75, 85, 99, 0.5)',
        borderWidth: 1
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(75, 85, 99, 0.2)' },
        ticks: { color: 'rgba(156, 163, 175, 1)' }
      },
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(156, 163, 175, 1)' }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: 'rgba(229, 231, 235, 1)' }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: 'rgba(243, 244, 246, 1)',
        bodyColor: 'rgba(229, 231, 235, 1)',
        borderColor: 'rgba(75, 85, 99, 0.5)',
        borderWidth: 1
      }
    }
  };

  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>AI Orchestration Analytics | RapidRoutes</title>
        <meta name="description" content="Real-time AI orchestration telemetry dashboard" />
      </Head>

      <div className="min-h-screen bg-gray-900 text-gray-100">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-100">
                  🤖 AI Orchestration Analytics
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Real-time telemetry and performance monitoring
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Auto-refresh toggle */}
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    autoRefresh
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  {autoRefresh ? '🔄 Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
                </button>

                {/* Manual refresh */}
                <button
                  onClick={fetchAnalytics}
                  disabled={loading}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '⏳ Loading...' : '🔄 Refresh'}
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="mt-4 flex gap-4">
              <select
                value={filters.days}
                onChange={(e) => setFilters({ ...filters, days: Number(e.target.value) })}
                className="px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Last 24 hours</option>
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={0}>All time</option>
              </select>

              {analytics?.modelStats && (
                <select
                  value={filters.model}
                  onChange={(e) => setFilters({ ...filters, model: e.target.value })}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All models</option>
                  {Object.keys(analytics.modelStats).map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              )}

              {analytics?.routeStats && (
                <select
                  value={filters.route}
                  onChange={(e) => setFilters({ ...filters, route: e.target.value })}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All routes</option>
                  {Object.keys(analytics.routeStats).map(route => (
                    <option key={route} value={route}>{route}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded text-red-400">
              <strong>Error:</strong> {error}
            </div>
          )}

          {analytics && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricCard
                  title="Total Decisions"
                  value={analytics.totalDecisions}
                  icon="📊"
                  color="blue"
                />
                <MetricCard
                  title="Avg Processing Time"
                  value={`${analytics.performanceMetrics?.avgOrchestrationOverhead?.toFixed(2) || 0}ms`}
                  icon="⚡"
                  color="purple"
                />
                <MetricCard
                  title="Avg AI Latency"
                  value={`${analytics.performanceMetrics?.avgAILatency?.toFixed(0) || 0}ms`}
                  icon="⏱️"
                  color="pink"
                />
                <MetricCard
                  title="Total Tokens"
                  value={analytics.performanceMetrics?.totalTokensUsed?.toLocaleString() || 0}
                  icon="🎫"
                  color="green"
                />
              </div>

              {/* Recommendations Section */}
              {analytics.recommendations && analytics.recommendations.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
                    💡 Optimization Recommendations
                  </h2>
                  <div className="space-y-3">
                    {analytics.recommendations.map((rec, idx) => {
                      const display = getSeverityDisplay(rec.severity);
                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded border ${display.bg} border-gray-700`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{display.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-sm font-semibold ${display.color} uppercase`}>
                                  {rec.severity}
                                </span>
                                {rec.model && (
                                  <span className="text-xs text-gray-400">
                                    • {rec.model}
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-200">{rec.message}</p>
                              {rec.type && (
                                <span className="inline-block mt-2 px-2 py-1 text-xs bg-gray-800 rounded">
                                  {rec.type}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No recommendations message */}
              {analytics.recommendations && analytics.recommendations.length === 0 && (
                <div className="mb-8 p-4 bg-green-900/20 border border-green-700 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">✅</span>
                    <span className="text-green-400 font-medium">
                      All systems optimal! No recommendations at this time.
                    </span>
                  </div>
                </div>
              )}

              {/* Charts Grid */}
              {chartData && (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Model Usage */}
                    <ChartCard title="Model Usage" icon="📈">
                      <Bar data={chartData.usageData} options={barOptions} />
                    </ChartCard>

                    {/* Success Rates */}
                    <ChartCard title="Success Rates" icon="✅">
                      <Bar data={chartData.successData} options={barOptions} />
                    </ChartCard>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Latency */}
                    <ChartCard title="Average Latency" icon="⏱️">
                      <Bar data={chartData.latencyData} options={barOptions} />
                    </ChartCard>

                    {/* Token Distribution */}
                    <ChartCard title="Token Distribution" icon="🎫">
                      <Doughnut data={chartData.tokenData} options={doughnutOptions} />
                    </ChartCard>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Confidence Distribution */}
                    <ChartCard title="Confidence Distribution" icon="🎯">
                      <Bar data={chartData.confidenceData} options={barOptions} />
                    </ChartCard>

                    {/* Additional Metrics */}
                    <ChartCard title="Additional Metrics" icon="📊">
                      <div className="h-full flex flex-col justify-center space-y-4 p-4">
                        <MetricRow
                          label="Override Rate"
                          value={`${(analytics.overrideRate * 100).toFixed(1)}%`}
                          good={analytics.overrideRate < 0.2}
                        />
                        <MetricRow
                          label="Avg Confidence"
                          value={`${((analytics.performanceMetrics?.avgConfidence || 0) * 100).toFixed(1)}%`}
                          good={(analytics.performanceMetrics?.avgConfidence || 0) > 0.8}
                        />
                        <MetricRow
                          label="Avg Tokens/Request"
                          value={analytics.performanceMetrics?.avgTokensPerRequest?.toFixed(0) || 0}
                        />
                        <MetricRow
                          label="Models Used"
                          value={Object.keys(analytics.modelStats || {}).length}
                        />
                        <MetricRow
                          label="Routes Used"
                          value={Object.keys(analytics.routeStats || {}).length}
                        />
                      </div>
                    </ChartCard>
                  </div>
                </>
              )}

              {/* Model Details Table */}
              {analytics.modelStats && Object.keys(analytics.modelStats).length > 0 && (
                <div className="mt-8">
                  <h2 className="text-xl font-bold text-gray-100 mb-4">Model Performance Details</h2>
                  <div className="overflow-x-auto bg-gray-800 rounded border border-gray-700">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-gray-900">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Model
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Usage
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Confidence
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Success
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Latency
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Tokens
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-gray-800 divide-y divide-gray-700">
                        {Object.entries(analytics.modelStats).map(([model, stats]) => (
                          <tr key={model} className="hover:bg-gray-700/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
                              {model}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {stats.usageCount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {(stats.avgConfidence * 100).toFixed(1)}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`${
                                (stats.successRate || 0) >= 90 ? 'text-green-400' :
                                (stats.successRate || 0) >= 75 ? 'text-yellow-400' :
                                'text-red-400'
                              }`}>
                                {stats.successRate?.toFixed(1) || 0}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {stats.avgLatency?.toFixed(0) || 0}ms
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {stats.totalTokens?.toLocaleString() || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// Reusable components
function MetricCard({ title, value, icon, color = 'blue' }) {
  const colorClasses = {
    blue: 'border-blue-700 bg-blue-900/20',
    purple: 'border-purple-700 bg-purple-900/20',
    pink: 'border-pink-700 bg-pink-900/20',
    green: 'border-green-700 bg-green-900/20',
  };

  return (
    <div className={`p-6 rounded border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-3xl">{icon}</span>
      </div>
      <h3 className="text-sm text-gray-400 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-100">{value}</p>
    </div>
  );
}

function ChartCard({ title, icon, children }) {
  return (
    <div className="p-6 bg-gray-800 rounded border border-gray-700">
      <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
        <span>{icon}</span>
        {title}
      </h3>
      <div className="h-64">
        {children}
      </div>
    </div>
  );
}

function MetricRow({ label, value, good }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`text-lg font-semibold ${
        good === true ? 'text-green-400' :
        good === false ? 'text-red-400' :
        'text-gray-100'
      }`}>
        {value}
      </span>
    </div>
  );
}
