import { useEffect, useState } from "react";
import Header from "../components/Header";
import supabase from "../utils/supabaseClient";
import { z } from "zod";

// Define zod schema for validating API payloads
const PostOptionsPayload = z.object({
  laneId: z.string().uuid(),
  originCity: z.string().min(1),
  originState: z.string().min(2),
  destinationCity: z.string().min(1),
  destinationState: z.string().min(2),
  equipmentCode: z.string().min(1),
});

export default function PostOptions() {
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Simple lane loading function
  async function loadLanes() {
    try {
      setLoading(true);
      console.log('Fetching current lanes from database...');
      
      const { data, error } = await supabase
        .from("lanes")
        .select("*")
        .eq("lane_status", "current")
        .limit(50);
      
      if (error) throw error;
      
      console.log(`Received ${data?.length || 0} lanes from database`);
      setLanes(data || []);
    } catch (error) {
      console.error('Error fetching lanes:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLanes();
  }, []);

  if (loading) return <div style={{padding:16}}>Loading lanes...</div>;

  return (
    <main style={{padding:16}}>
      <Header />
      <h2>Post Options</h2>
      {lanes.length === 0 ? (
        <p>No lanes found.</p>
      ) : (
        lanes.map((l) => (
          <div key={l.id} style={{marginBottom:8,borderBottom:"1px solid #222",paddingBottom:4}}>
            {l.origin_city} ({l.origin_state}) → {l.destination_city || l.dest_city} ({l.destination_state || l.dest_state})
          </div>
        ))
      )}
    </main>
  );
}