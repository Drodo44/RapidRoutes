// utils/apiClient.js
import supabase from './supabaseClient';

export async function fetchLanes(options = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No authentication token');
    }

    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.order) params.append('order', options.order);
    if (options.limit) params.append('limit', options.limit.toString());

    const response = await fetch(`/api/lanes?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('fetchLanes error:', error);
    throw error;
  }
}

export async function fetchLaneStats() {
  try {
    const [current, archive] = await Promise.all([
      fetchLanes({ lane_status: 'current' }),
      fetchLanes({ lane_status: 'archive' }),
    ]);

    return {
      currentCount: current.length,
      archiveCount: archive.length,
      totalCount: current.length + archive.length,
      recapCount: 0, // Will add this later
    };
  } catch (error) {
    console.error('fetchLaneStats error:', error);
    return {
      pendingCount: 0,
      postedCount: 0,
      coveredCount: 0,
      recapCount: 0,
    };
  }
}
