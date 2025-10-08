import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Header from "@/components/Header";
import supabase from "@/utils/supabaseClient";
import { safeGetCurrentToken } from "@/lib/auth/safeAuth";
import { z } from "zod";

// Define zod schema for validating API payloads
const PostOptionsPayload = z.object({
  laneId: z.string().uuid({
    message: "Invalid lane ID format",
  }),
  originCity: z.string().min(1, {
    message: "Origin city is required",
  }),
  originState: z.string().min(2, {
    message: "Origin state is required (2-letter code)",
  }),
  destinationCity: z.string().min(1, {
    message: "Destination city is required",
  }),
  destinationState: z.string().min(2, {
    message: "Destination state is required (2-letter code)",
  }),
  equipmentCode: z.string().min(1, {
    message: "Equipment code is required",
  }),
});

export default function PostOptions() {
  const router = useRouter();
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const [page, setPage] = useState(1);
  const [totalLanes, setTotalLanes] = useState(0);
  const PAGE_SIZE = 20;

  // Fetch pending lanes on component mount with pagination
  async function loadLanes(pageNum = 1) {
    try {
      setLoading(true);
      console.log(`Fetching current lanes from database (page ${pageNum})...`);
      
      // First get total count for pagination
      const { count, error: countError } = await supabase
        .from("lanes")
        .select("*", { count: 'exact', head: true })
        .eq("lane_status", "current");
        
      if (countError) throw countError;
      setTotalLanes(count || 0);
      
      // Then fetch the current page
      const from = (pageNum - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      const { data, error } = await supabase
        .from("lanes")
        .select("*")
        .eq("lane_status", "current")
        .order("created_at", { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      
      console.log(`Received ${data?.length || 0} lanes from database (${count} total)`);
      
      // Normalize lane data to have both snake_case and camelCase fields
      const normalizedLanes = (data || []).map(lane => {
        // Create a new lane object with both snake_case and camelCase properties
        return {
          ...lane,
          originCity: lane.origin_city,
          originState: lane.origin_state,
          destinationCity: lane.destination_city || lane.dest_city,
          destinationState: lane.destination_state || lane.dest_state,
          equipmentCode: lane.equipment_code
        };
      });
      
      setLanes(normalizedLanes);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching lanes:', error);
      setAlert({ type: 'error', message: 'Failed to load lanes' });
    } finally {
      setLoading(false);
    }
  }

  // Handle generating options for a lane
  async function handleGenerateOptions(lane) {
    try {
      // Get laneId from either format
      const laneId = lane?.id ?? lane?.laneId ?? null;
      
      if (!laneId) {
        console.error('Missing laneId in handleGenerateOptions');
        return;
      }
      
      // Create payload with both formats of data
      const payload = {
        laneId,
        originCity: lane?.originCity ?? lane?.origin_city ?? '',
        originState: lane?.originState ?? lane?.origin_state ?? '',
        destinationCity: lane?.destinationCity ?? lane?.destination_city ?? '',
        destinationState: lane?.destinationState ?? lane?.destination_state ?? '',
        equipmentCode: lane?.equipmentCode ?? lane?.equipment_code ?? '',
      };

      // Validate with zod
      const parsed = PostOptionsPayload.safeParse(payload);
      if (!parsed.success) {
        console.error('Invalid payload for /api/post-options:', parsed.error.flatten());
        setAlert({ type: 'error', message: 'Invalid lane data' });
        return;
      }

      // Get token from safe auth helper
      const accessToken = await safeGetCurrentToken(supabase);
      if (!accessToken) {
        console.error('Missing access token when posting options');
        setAlert({ type: 'error', message: 'Authentication failed - please log in again' });
        return;
      }

      // Make the API call
      setAlert({ type: 'info', message: `Generating options for lane ${laneId}...` });
      const res = await fetch('/api/post-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('Failed to generate options:', text || res.status);
        setAlert({ type: 'error', message: 'Failed to generate options' });
        return;
      }

      const json = await res.json();
      console.log('Options generated successfully:', json);
      setAlert({ type: 'success', message: 'Options generated successfully' });
      return json;
    } catch (err) {
      console.error('Error in handleGenerateOptions:', err);
      setAlert({ type: 'error', message: `Error: ${err.message}` });
    }
  }

  const [processingStatus, setProcessingStatus] = useState({
    isProcessing: false,
    current: 0,
    total: 0,
    success: 0,
    errors: 0
  });

  // Batch generate for all lanes 
  async function handleGenerateAllOptions() {
    console.log('Generate All Options clicked, total lanes:', lanes.length);
    
    if (lanes.length === 0) {
      setAlert({ type: 'warning', message: 'No lanes to process' });
      return;
    }
    
    // Initialize processing state
    setProcessingStatus({
      isProcessing: true,
      current: 0,
      total: lanes.length,
      success: 0,
      errors: 0
    });
    
    setAlert({ type: 'info', message: `Processing ${lanes.length} lanes...` });
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];
      setProcessingStatus(prev => ({
        ...prev,
        current: i + 1,
        success: successCount,
        errors: errorCount
      }));
      
      try {
        await handleGenerateOptions(lane);
        successCount++;
        setProcessingStatus(prev => ({ ...prev, success: successCount }));
      } catch (error) {
        console.error(`Failed to process lane ${lane.id}:`, error);
        errorCount++;
        setProcessingStatus(prev => ({ ...prev, errors: errorCount }));
      }
      
      // Update alert message periodically
      if (i % 5 === 0 || i === lanes.length - 1) {
        setAlert({ 
          type: 'info', 
          message: `Processing: ${i + 1}/${lanes.length} lanes (${successCount} success, ${errorCount} errors)`
        });
      }
      
      // Small delay to prevent UI freezing
      await new Promise(r => setTimeout(r, 50));
    }
    
    // Final status update
    setProcessingStatus({
      isProcessing: false,
      current: lanes.length,
      total: lanes.length,
      success: successCount,
      errors: errorCount
    });
    
    setAlert({ 
      type: errorCount > 0 ? 'warning' : 'success', 
      message: `Completed: ${successCount} success, ${errorCount} errors`
    });
  }

  useEffect(() => {
    // Load the first page of lanes on component mount
    loadLanes(1);
    
    // Listen for route changes that include page parameter
    const handleRouteChange = () => {
      const pageParam = router.query.page;
      if (pageParam) {
        const pageNum = parseInt(pageParam, 10);
        if (!isNaN(pageNum) && pageNum > 0) {
          loadLanes(pageNum);
        }
      }
    };
    
    // Run once on mount to check for initial page parameter
    handleRouteChange();
    
    // No need for router event listeners since we're handling it on mount
  }, [router.query.page]);

  if (loading) return (
    <>
      <Header />
      <div className="p-6 min-h-screen bg-gray-900 text-gray-100">
        <div className="flex items-center justify-center h-40">
          <div className="text-center">Loading lanes...</div>
        </div>
      </div>
    </>
  );
  return (
    <>
      <Head>
        <title>Post Options - RapidRoutes</title>
      </Head>
      <Header />
      <div className="p-6 min-h-screen bg-gray-900 text-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Lane Post Options</h1>
            <div className="flex gap-2">
              <button
                onClick={loadLanes}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded"
              >
                Refresh Lanes
              </button>
              <button
                onClick={handleGenerateAllOptions}
                disabled={lanes.length === 0 || processingStatus.isProcessing}
                className={`px-4 py-2 ${
                  lanes.length === 0 || processingStatus.isProcessing
                    ? 'bg-gray-700 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                } text-white rounded flex items-center`}
              >
                {processingStatus.isProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing {processingStatus.current}/{processingStatus.total}
                  </>
                ) : (
                  <>Generate All Options ({lanes.length})</>
                )}
              </button>
            </div>
          </div>

          {/* Alert Message */}
          {alert && (
            <div className={`p-4 mb-6 rounded ${
              alert.type === 'success' ? 'bg-green-800 text-green-100 border border-green-700' :
              alert.type === 'error' ? 'bg-red-800 text-red-100 border border-red-700' :
              alert.type === 'warning' ? 'bg-yellow-800 text-yellow-100 border border-yellow-700' :
              'bg-blue-800 text-blue-100 border border-blue-700'
            }`}>
              {alert.message}
            </div>
          )}

          {/* Lanes List with Stats */}
          <div className="mb-4 flex justify-between items-center">
            <div className="text-gray-400">
              {totalLanes > 0 ? (
                <span>
                  Showing {((page - 1) * PAGE_SIZE) + 1}-{Math.min(page * PAGE_SIZE, totalLanes)} of {totalLanes} lanes
                </span>
              ) : (
                <span>No lanes found</span>
              )}
            </div>
          </div>

          {lanes.length === 0 ? (
            <div className="bg-gray-800 border border-gray-700 p-6 rounded text-center">
              <p>No active lanes found. Create lanes to see them here.</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {lanes.map((lane) => (
                  <div 
                    key={lane.id} 
                    className="flex items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded"
                  >
                    <div>
                      <div className="font-medium">
                        {lane.origin_city}, {lane.origin_state} → {lane.destination_city || lane.dest_city}, {lane.destination_state || lane.dest_state}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs mr-2">
                          {lane.equipment_code}
                        </span>
                        <span className="text-xs">
                          {lane.weight_lbs ? `${lane.weight_lbs} lbs` : 'No weight'} 
                          {lane.length_ft ? ` • ${lane.length_ft} ft` : ''}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">ID: {lane.id.substring(0,8)}...</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleGenerateOptions(lane)}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded"
                    >
                      Generate Options
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Pagination Controls */}
              {totalLanes > PAGE_SIZE && (
                <div className="flex justify-center mt-6">
                  <nav className="bg-gray-800 inline-flex rounded-md shadow-sm -space-x-px overflow-hidden" aria-label="Pagination">
                    <button
                      onClick={() => loadLanes(page > 1 ? page - 1 : 1)}
                      disabled={page === 1}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-medium ${
                        page === 1 
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      } border-r border-gray-700`}
                    >
                      Previous
                    </button>
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, Math.ceil(totalLanes / PAGE_SIZE)) }, (_, i) => {
                      // Show current page, 2 before and 2 after when possible
                      let pageNum;
                      const totalPages = Math.ceil(totalLanes / PAGE_SIZE);
                      
                      if (page <= 3) {
                        // At start, show first 5 pages
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        // At end, show last 5 pages
                        pageNum = totalPages - 4 + i;
                      } else {
                        // In middle, show current and 2 on each side
                        pageNum = page - 2 + i;
                      }
                      
                      // Only render if page number is valid
                      if (pageNum > 0 && pageNum <= totalPages) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => loadLanes(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-medium ${
                              page === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            } border-r border-gray-700`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                      return null;
                    })}
                    
                    <button
                      onClick={() => loadLanes(page < Math.ceil(totalLanes / PAGE_SIZE) ? page + 1 : page)}
                      disabled={page >= Math.ceil(totalLanes / PAGE_SIZE)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-medium ${
                        page >= Math.ceil(totalLanes / PAGE_SIZE)
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      Next
                    </button>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}