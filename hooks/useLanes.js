import { useEffect, useRef, useState } from "react";
import supabase from "../utils/supabaseClient";

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
      if (!error && data) setLanes(data);
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