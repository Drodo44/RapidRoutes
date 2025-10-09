import { useEffect, useRef, useState } from "react";
import supabase from "../utils/supabaseClient";

/**
 * Normalize lane data to ensure consistent field access and prevent render-time computations
 * @param {Array} lanes - Raw lane data from database
 * @returns {Array} - Normalized lane data with consistent field naming and pre-computed values
 */
function normalizeLaneData(lanes = []) {
  if (!lanes || !Array.isArray(lanes)) {
    console.warn("[useLanes] Invalid lane data received:", lanes);
    return [];
  }
  
  try {
    return lanes.map(lane => {
      if (!lane) return null;
      
      // Pre-compute derived fields to avoid computations during render
      const normalizedLane = {
        ...lane,
        // Ensure these fields always exist with correct values
        destinationCity: lane.destination_city || lane.dest_city || '',
        destinationState: lane.destination_state || lane.dest_state || '',
        originCity: lane.origin_city || '',
        originState: lane.origin_state || '',
        // Format any display values ahead of time
        formattedWeight: lane.weight_lbs ? lane.weight_lbs.toLocaleString() : '',
        shortId: lane.id ? lane.id.substring(0, 8) : 'unknown',
        // Use distance instead of distance_miles
        distance: lane.distance || null,
        // Ensure status is always available
        status: lane.status || 'Unknown'
      };
      
      return normalizedLane;
    }).filter(Boolean); // Remove any null entries that might have resulted from invalid data
  } catch (normalizationError) {
    console.error("[useLanes] Error normalizing lane data:", normalizationError);
    return [];
  }
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
        .eq("status", "Current") // Only fetch lanes with status "Current"
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) {
        console.error("[useLanes] Error fetching lanes:", error);
        return;
      }
      
      if (!data) {
        console.warn("[useLanes] No lane data returned");
        setLanes([]);
        return;
      }
      
      // Normalize lane data before setting state to avoid render-time computations
      const normalizedLanes = normalizeLaneData(data);
      setLanes(normalizedLanes);
    } catch (fetchError) {
      console.error("[useLanes] Exception in fetchLanes:", fetchError);
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