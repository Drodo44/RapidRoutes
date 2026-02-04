// components/analytics/AnalyticsTable.js
import React, { useState, useMemo } from 'react';

/**
 * Sortable table component for displaying lane analytics data
 * 
 * @param {Object} props
 * @param {Array} props.data - Array of lane data objects to display
 * @param {Array} props.columns - Array of column configuration objects
 * @param {boolean} props.loading - Whether data is loading
 * @param {string} props.defaultSortField - Default field to sort by
 * @param {boolean} props.defaultSortAsc - Whether default sort is ascending
 * @param {number} props.limit - Maximum number of rows to display
 */
export default function AnalyticsTable({
  data = [],
  columns = [],
  loading = false,
  defaultSortField = 'created_at',
  defaultSortAsc = false,
  limit = 10
}) {
  // State for sorting
  const [sortField, setSortField] = useState(defaultSortField);
  const [sortAsc, setSortAsc] = useState(defaultSortAsc);
  const [page, setPage] = useState(0);

  // Handle sort change
  const handleSortChange = (field) => {
    if (field === sortField) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Sort and paginate data
  const sortedData = useMemo(() => {
    if (!data.length) return [];
    
    // Create a copy to avoid mutating props
    const sorted = [...data].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      // Handle null/undefined values
      if (aValue == null) return sortAsc ? -1 : 1;
      if (bValue == null) return sortAsc ? 1 : -1;
      
      // Compare based on data type
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortAsc 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      // Handle numbers, booleans, dates
      return sortAsc ? aValue - bValue : bValue - aValue;
    });
    
    return sorted;
  }, [data, sortField, sortAsc]);

  // Get current page of data
  const paginatedData = useMemo(() => {
    const start = page * limit;
    return sortedData.slice(start, start + limit);
  }, [sortedData, page, limit]);

  // Calculate total pages
  const totalPages = Math.ceil(sortedData.length / limit);

  // Handle page changes
  const handlePrevPage = () => {
    setPage(Math.max(0, page - 1));
  };

  const handleNextPage = () => {
    setPage(Math.min(totalPages - 1, page + 1));
  };

  // Status color mapper
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'current':
        return 'bg-green-800 text-green-100';
      case 'archived':
        return 'bg-gray-700 text-gray-300';
      case 'pending':
        return 'bg-yellow-800 text-yellow-100';
      case 'failed':
        return 'bg-red-800 text-red-100';
      default:
        return 'bg-blue-800 text-blue-100';
    }
  };

  // Format cell data based on type
  const formatCellData = (value, column) => {
    if (value === null || value === undefined) {
      return '-';
    }
    
    if (column.format) {
      return column.format(value);
    }
    
    if (column.type === 'date' && value) {
      return new Date(value).toLocaleString();
    }
    
    if (column.type === 'status' && value) {
      return (
        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(value)}`}>
          {value}
        </span>
      );
    }
    
    if (column.type === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return value.toString();
  };

  return (
    <div className="overflow-hidden border border-gray-700 rounded-lg">
      {loading ? (
        <div className="bg-gray-800 p-6 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
          <p className="text-gray-400">Loading analytics data...</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-800">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.field}
                      onClick={() => handleSortChange(column.field)}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                    >
                      <div className="flex items-center">
                        {column.header}
                        {sortField === column.field && (
                          <span className="ml-1">
                            {sortAsc ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-gray-900 divide-y divide-gray-800">
                {paginatedData.length > 0 ? (
                  paginatedData.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-gray-800">
                      {columns.map((column) => (
                        <td key={`${item.id || index}-${column.field}`} className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                          {formatCellData(item[column.field], column)}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-6 text-center text-gray-400"
                    >
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {sortedData.length > limit && (
            <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
              <div className="flex-1 text-sm text-gray-400">
                Showing {page * limit + 1}-{Math.min((page + 1) * limit, sortedData.length)} of {sortedData.length} results
              </div>
              <div className="flex">
                <button
                  onClick={handlePrevPage}
                  disabled={page === 0}
                  className={`px-3 py-1 rounded-l-md ${
                    page === 0
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={page >= totalPages - 1}
                  className={`px-3 py-1 rounded-r-md ${
                    page >= totalPages - 1
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}