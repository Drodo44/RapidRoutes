import { useEffect, useRef, useState } from "react";
import supabase from "../utils/supabaseClient";

/**
 * Normalize lane data to ensure consistent field access
 * @param {Array} lanes - Raw lane data from database
 * @returns {Array} - Normalized lane data
 */
function normalizeLaneData(lanes = []) {
  if (!lanes || !Array.isArray(lanes)) return [];
  
  return lanes.map(lane => {
    // Pre-compute derived fields to avoid computations during render
    const normalizedLane = {
      ...lane,
      // Ensure these fields always exist with correct values
      destinationCity: lane.destination_city || lane.dest_city || '',
      destinationState: lane.destination_state || lane.dest_state || '',
      // Format any display values ahead of time
      formattedWeight: lane.weight_lbs ? lane.weight_lbs.toLocaleString() : '',
      shortId: lane.id ? lane.id.substring(0, 8) : 'unknown'
    };
    
    return normalizedLane;
  });
}

export function useLanes() {
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const isFetching = useRef(false);

  async function fetchLanes() {
    if (isFetching.current) return; // ✅ prevent infinite loop
    isFetching.current = true;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lanes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (!error && data) {
        // Normalize lane data before setting state to avoid render-time computations
        const normalizedLanes = normalizeLaneData(data);
        setLanes(normalizedLanes);
      }
    } finally {
      isFetching.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLanes();
  }, []);

  return { lanes, loading, refresh: fetchLanes };
}