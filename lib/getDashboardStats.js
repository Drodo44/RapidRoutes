/**
 * Get standardized dashboard statistics for the RapidRoutes analytics dashboard
 * @returns {Promise<Object>} Dashboard statistics 
 */
export async function getDashboardStats() {
  try {
    // Fetch analytics data from the API endpoint
    const r = await fetch("/api/analytics/summary", { 
      method: "GET", 
      headers: { "cache-control": "no-store" }
    });
    
    // Parse JSON response
    const j = await r.json().catch(() => ({}));
    
    // Validate response 
    if (!j || j.ok === false) {
      return { 
        totalLanes: 0,
        activeLanes: 0, 
        archivedLanes: 0,
        currentCount: 0,  // For backwards compatibility
        archivedCount: 0, // For backwards compatibility
        recapCount: 0, 
        recentLanes: [],
        ok: false, 
        error: j?.error || "Unknown error fetching analytics data" 
      };
    }
    
    // Return success with data
    return { 
      ...j,
      ok: true 
    };
  } catch (e) {
    // Return safe defaults in case of error
    return { 
      totalLanes: 0,
      activeLanes: 0, 
      archivedLanes: 0,
      currentCount: 0,  // For backwards compatibility
      archivedCount: 0, // For backwards compatibility
      recapCount: 0,
      recentLanes: [],
      ok: false, 
      error: String(e) 
    };
  }
}