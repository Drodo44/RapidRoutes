import { useState } from 'react';
import toast from 'react-hot-toast';

export default function DatExportDebug() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [debugOutput, setDebugOutput] = useState([]);

  const handleExport = async (params = {}) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setDebugOutput([]);

    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `/api/exportDatCsv${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || `HTTP ${response.status}`);
        toast.error(`❌ Export failed: ${data.error || 'Unknown error'}`);
      } else {
        setResult(data);
        setDebugOutput(data.debug || []);
        toast.success(`✅ Export complete: ${data.totalRows} rows generated`);
      }
    } catch (err) {
      setError(err.message);
      toast.error(`❌ Export failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">DAT Export Debug</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Quick Export Options</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <button
              onClick={() => handleExport({ pending: '1' })}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded font-medium"
            >
              {loading ? 'Exporting...' : 'Export Pending Lanes'}
            </button>
            
            <button
              onClick={() => handleExport({ days: '7' })}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded font-medium"
            >
              {loading ? 'Exporting...' : 'Export Last 7 Days'}
            </button>
            
            <button
              onClick={() => handleExport({ all: '1' })}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-4 py-2 rounded font-medium"
            >
              {loading ? 'Exporting...' : 'Export All Lanes'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-6">
            <h3 className="text-red-300 font-semibold mb-2">Export Error</h3>
            <p className="text-red-100">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-green-300 font-semibold mb-4">Export Results</h3>
            
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <div className="bg-gray-700 rounded p-4">
                <h4 className="font-medium mb-2">Lane Summary</h4>
                <p>Total Lanes: <span className="text-blue-300">{result.totalLanes}</span></p>
                <p>Successful: <span className="text-green-300">{result.successful}</span></p>
                <p>Failed: <span className="text-red-300">{result.failed}</span></p>
              </div>
              
              <div className="bg-gray-700 rounded p-4">
                <h4 className="font-medium mb-2">CSV Output</h4>
                <p>Total Rows: <span className="text-blue-300">{result.totalRows}</span></p>
                <p>Selected Rows: <span className="text-yellow-300">{result.selectedRows}</span></p>
                <p>Parts: <span className="text-purple-300">{result.parts}</span></p>
              </div>
            </div>

            {result.url && (
              <div className="bg-green-900 border border-green-700 rounded-lg p-4">
                <h4 className="text-green-300 font-semibold mb-2">Download Ready</h4>
                <p className="mb-3">CSV file has been generated and is ready for download:</p>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-medium"
                >
                  📁 Download dat_output.csv
                </a>
              </div>
            )}

            {result.details && (
              <div className="mt-4 bg-gray-700 rounded p-4">
                <h4 className="font-medium mb-2">Technical Details</h4>
                <div className="text-sm text-gray-300 space-y-1">
                  <p>Generator: Phase 9 Enterprise System</p>
                  <p>KMA Diversity: Geographic crawl (75→100→125 mile radius)</p>
                  <p>DAT Compliance: 24 headers, chunked at 499 rows</p>
                  <p>Export Time: {new Date().toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {debugOutput?.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-yellow-300 font-semibold mb-4">🚛 Lane Export Debug Logs</h3>
            <div className="bg-gray-900 rounded p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-gray-300" style={{ whiteSpace: 'pre-wrap', fontSize: '0.9em' }}>
                {debugOutput.join('\n')}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
