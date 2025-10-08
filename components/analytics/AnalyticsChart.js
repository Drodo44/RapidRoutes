// components/analytics/AnalyticsChart.js
import React, { useState } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

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
  
  // Sanitize data for chart rendering
  const sanitizedData = data.map(item => {
    const result = { ...item };
    // Ensure all yKeys exist with at least 0 value
    yKeys.forEach(key => {
      if (result[key] === undefined || result[key] === null) {
        result[key] = 0;
      }
    });
    return result;
  });

  // Generate display labels for legend
  const displayLabels = labels.length >= yKeys.length 
    ? labels 
    : yKeys.map(key => key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '));

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
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-md p-2 shadow-lg">
        <p className="text-gray-300 font-medium mb-1">{label}</p>
        {payload.map((entry, index) => (
          <div key={`tooltip-${index}`} className="flex items-center">
            <div 
              className="w-3 h-3 mr-2 rounded-sm" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-400">{entry.name}: </span>
            <span className="text-gray-200 ml-1 font-medium">
              {typeof entry.value === 'number' 
                ? entry.value.toLocaleString()
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

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
  if (!data.length) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 text-center" style={containerStyle}>
        <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="mt-2 text-gray-400">No chart data available</p>
      </div>
    );
  }

  // Chart type toggle buttons
  const ChartTypeToggle = () => (
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

  // Chart title component
  const ChartTitle = () => (
    <h3 className="text-gray-200 font-medium mb-4">{title}</h3>
  );

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <ChartTitle />
        <ChartTypeToggle />
      </div>
      
      <div style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' && (
            <BarChart data={sanitizedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis 
                dataKey={xKey} 
                tick={{ fill: '#9CA3AF' }} 
                axisLine={{ stroke: '#4B5563' }} 
                tickLine={{ stroke: '#4B5563' }} 
              />
              <YAxis 
                tick={{ fill: '#9CA3AF' }} 
                axisLine={{ stroke: '#4B5563' }} 
                tickLine={{ stroke: '#4B5563' }} 
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => <span className="text-gray-300">{value}</span>} 
              />
              {yKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={COLOR_ARRAY[index % COLOR_ARRAY.length]}
                  name={displayLabels[index]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          )}

          {chartType === 'line' && (
            <LineChart data={sanitizedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey={xKey} 
                tick={{ fill: '#9CA3AF' }} 
                axisLine={{ stroke: '#4B5563' }} 
                tickLine={{ stroke: '#4B5563' }} 
              />
              <YAxis 
                tick={{ fill: '#9CA3AF' }} 
                axisLine={{ stroke: '#4B5563' }} 
                tickLine={{ stroke: '#4B5563' }} 
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => <span className="text-gray-300">{value}</span>} 
              />
              {yKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLOR_ARRAY[index % COLOR_ARRAY.length]}
                  name={displayLabels[index]}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          )}

          {chartType === 'pie' && (
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                formatter={(value) => <span className="text-gray-300">{value}</span>}
              />
              <Pie
                data={sanitizedData}
                nameKey={xKey}
                dataKey={yKeys[0]}
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: '#4B5563', strokeWidth: 1 }}
              >
                {sanitizedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLOR_ARRAY[index % COLOR_ARRAY.length]} 
                  />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}