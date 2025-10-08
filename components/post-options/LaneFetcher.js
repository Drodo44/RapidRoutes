// components/post-options/LaneFetcher.js
import { useState, useEffect } from 'react';
import supabase from '../../utils/supabaseClient';
import { validateLaneData } from '../../services/laneIntelligence';

/**
 * Custom hook to fetch lanes from Supabase
 * @param {Object} options - Options for fetching lanes
 * @param {number} options.limit - Maximum number of lanes to fetch
 * @param {boolean} options.currentOnly - If true, only fetch lanes with status "current"
 * @param {string} options.orderBy - Column to order by
 * @param {boolean} options.ascending - If true, order in ascending order
 * @returns {Object} - { lanes, loading, error, refetch }
 */
export function useLanes({
  limit = 50,
  currentOnly = true,
  orderBy = 'created_at',
  ascending = false
} = {}) {
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch lanes that can be called to refresh data
  const fetchLanes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching lanes from Supabase...');
      
      // Start building the query
      let query = supabase.from('lanes').select('*');
      
      // Apply filters
      if (currentOnly) {
        query = query.eq('lane_status', 'current');
      }
      
      // Apply ordering
      query = query.order(orderBy, { ascending });
      
      // Apply limit if provided
      if (limit > 0) {
        query = query.limit(limit);
      }
      
      // Execute the query
      const { data, error: supabaseError } = await query;
      
      if (supabaseError) {
        throw supabaseError;
      }
      
      console.log(`Fetched ${data?.length || 0} lanes`);
      
      // Validate lanes using the service
      const validatedLanes = (data || []).map(lane => {
        const validation = validateLaneData(lane);
        return validation.success ? validation.data : lane;
      });
      
      setLanes(validatedLanes);
    } catch (err) {
      console.error('Error fetching lanes:', err);
      setError(err.message || 'Failed to fetch lanes');
    } finally {
      setLoading(false);
    }
  };

  // Fetch lanes on component mount
  useEffect(() => {
    fetchLanes();
  }, [limit, currentOnly, orderBy, ascending]);

  return { lanes, loading, error, refetch: fetchLanes };
}