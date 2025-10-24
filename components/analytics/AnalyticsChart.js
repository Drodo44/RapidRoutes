// components/analytics/AnalyticsChart.js
/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip as CTooltip, Legend as CLegend, Title as CTitle } from 'chart.js';
import { Bar as BarChartJS, Line as LineChartJS, Pie as PieChartJS } from 'react-chartjs-2';
import ErrorBoundary from '../ErrorBoundary';

// Color palette for dark mode
const CHART_COLORS = {
  primary: '#3b82f6', // blue-500
  secondary: '#10b981', // emerald-500
  tertiary: '#6366f1', // indigo-500
  quaternary: '#f59e0b', // amber-500
  error: '#ef4444', // red-500
  success: '#22c55e', // green-500
  gray: '#6b7280', // gray-500
};

// Color array for pie/bar segments
const COLOR_ARRAY = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.tertiary,
  CHART_COLORS.quaternary,
  CHART_COLORS.success,
  CHART_COLORS.error,
  CHART_COLORS.gray,
];

// Register Chart.js components once at module scope
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, CTooltip, CLegend, CTitle);

// Small presentational components
function ChartTypeToggle({ chartType, setChartType }) {
  return (
    <div className="flex space-x-2 mb-4">
      <button
        onClick={() => setChartType('bar')}
        className={`px-3 py-1 text-xs rounded ${
          chartType === 'bar'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        Bar
      </button>
      <button
        onClick={() => setChartType('line')}
        className={`px-3 py-1 text-xs rounded ${
          chartType === 'line'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        Line
      </button>
      <button
        onClick={() => setChartType('pie')}
        className={`px-3 py-1 text-xs rounded ${
          chartType === 'pie'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        Pie
      </button>
    </div>
  );
}

function ChartTitle({ title }) {
  return <h3 className="text-gray-200 font-medium mb-4">{title}</h3>;
}

/**
 * Analytics chart component with multiple visualization options
 * 
 * @param {Object} props
 * @param {Array} props.data - Array of data points
 * @param {string} props.type - Chart type: 'bar', 'line', 'pie'
 * @param {string} props.xKey - Key for X axis values
 * @param {Array} props.yKeys - Keys for Y axis values or data points
 * @param {Array} props.labels - Labels for data series
 * @param {string} props.title - Chart title
 * @param {boolean} props.loading - Whether data is loading
 * @param {Object} props.options - Additional chart options
 */
export default function AnalyticsChart({
  data = [],
  type = 'bar',
  xKey = 'name',
  yKeys = ['value'],
  labels = [],
  title = 'Analytics Chart',
  loading = false,
  options = {}
}) {
  // State for chart type toggle
  const [chartType, setChartType] = useState(type);
  
  
  // Sanitize axis keys
  const safeXKey = typeof xKey === 'string' && xKey.length > 0 ? xKey : 'name';
  const sourceArray = Array.isArray(data) ? data : [];
  const firstObj = sourceArray.find(e => e && typeof e === 'object' && !Array.isArray(e)) || {};
  const derivedYKeys = Object.keys(firstObj).filter(k => k !== safeXKey && typeof firstObj[k] === 'number');
  let safeYKeys = [];
  if (Array.isArray(yKeys) && yKeys.length > 0) {
    safeYKeys = yKeys.filter(k => typeof k === 'string' && k);
  } else {
    safeYKeys = derivedYKeys.length ? derivedYKeys : ['value'];
  }

  // Sanitize data for chart rendering
  const safeData = sourceArray.filter(item => item && typeof item === 'object' && !Array.isArray(item));
  const sanitizedData = safeData.map(item => {
    const result = { ...item };
    // Ensure all y keys exist and are numeric
    for (const key of safeYKeys) {
      const v = result[key];
      const n = typeof v === 'number' ? v : Number(v);
      result[key] = Number.isFinite(n) ? n : 0;
    }
    return result;
  });

  // Generate display labels for legend
  const displayLabels = Array.isArray(labels) && labels.length >= safeYKeys.length 
    ? labels 
    : safeYKeys.map(key => String(key).charAt(0).toUpperCase() + String(key).slice(1).split('_').join(' '));

  // Default chart height
  const height = options.height || 300;
  
  // Chart container styles
  const containerStyle = {
    width: '100%',
    height: `${height}px`,
    backgroundColor: '#111827', // bg-gray-900
    borderRadius: '0.5rem',
    padding: '1rem',
    border: '1px solid #374151', // border-gray-700
  };

  // Tooltip styling for dark mode
  // Use default Tooltip/Legend to avoid third-party child.props assumptions

  // Loading state
  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-center" style={containerStyle}>
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
        <p className="text-gray-400">Loading chart data...</p>
      </div>
    );
  }

  // Empty state
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 text-center" style={containerStyle}>
        <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="mt-2 text-gray-400">No chart data available</p>
      </div>
    );
  }

  // If we still can't determine series, render a safe fallback
  if (!safeYKeys.length) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6" style={containerStyle}>
        <h3 className="text-gray-200 font-medium mb-2">{title}</h3>
        <p className="text-gray-400 text-sm">No numeric series found to chart.</p>
      </div>
    );
  }

  // Chart type toggle buttons
  // Chart title and toggle moved to module-level components above

  // Prepare Chart.js datasets and options
  const chartLabels = sanitizedData.map(d => String(d?.[safeXKey] ?? ''));
  const datasets = safeYKeys.map((key, index) => ({
    label: displayLabels[index] ?? String(key),
    data: sanitizedData.map(d => d[key] ?? 0),
    backgroundColor: COLOR_ARRAY[index % COLOR_ARRAY.length] + 'CC',
    borderColor: COLOR_ARRAY[index % COLOR_ARRAY.length],
    borderWidth: 1,
    tension: 0.3,
    pointRadius: 2,
  }));

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#E5E7EB' } },
      title: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      x: { ticks: { color: '#9CA3AF' }, grid: { color: '#374151' } },
      y: { ticks: { color: '#9CA3AF' }, grid: { color: '#374151' } },
    },
  };

  const barData = { labels: chartLabels, datasets };
  const lineData = { labels: chartLabels, datasets };
  const pieData = {
    labels: chartLabels,
    datasets: [{
      label: displayLabels[0] ?? 'Value',
      data: sanitizedData.map(d => d[safeYKeys[0]] ?? 0),
      backgroundColor: sanitizedData.map((_, i) => COLOR_ARRAY[i % COLOR_ARRAY.length] + 'CC'),
      borderColor: sanitizedData.map((_, i) => COLOR_ARRAY[i % COLOR_ARRAY.length]),
      borderWidth: 1,
    }]
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
  <ChartTitle title={title} />
  <ChartTypeToggle chartType={chartType} setChartType={setChartType} />
      </div>
      <div style={{ height: `${height}px` }}>
        <ErrorBoundary componentName="AnalyticsChart">
          {chartType === 'bar' && (
            <BarChartJS data={barData} options={commonOptions} />
          )}
          {chartType === 'line' && (
            <LineChartJS data={lineData} options={commonOptions} />
          )}
          {chartType === 'pie' && (
            <PieChartJS data={pieData} options={{ ...commonOptions, scales: undefined }} />
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
}