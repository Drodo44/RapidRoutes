import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function PostOptions() {
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadLanes() {
    try {
      const { data, error } = await supabase
        .from("lanes")
        .select("*")
        .limit(50);
      if (error) throw error;
      setLanes(data || []);
    } catch (err) {
      console.error("Error loading lanes:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLanes();
  }, []);

  if (loading) return <div style={{padding:16}}>Loading…</div>;
  return (
    <main style={{padding:16}}>
      <Header />
      <h2>Post Options</h2>
      {lanes.length === 0 ? (
        <p>No lanes found.</p>
      ) : (
        lanes.map((l) => (
          <div key={l.id} style={{marginBottom:8,borderBottom:"1px solid #222",paddingBottom:4}}>
            {l.origin_city} ({l.origin_state}) → {l.destination_city} ({l.destination_state})
          </div>
        ))
      )}
    </main>
  );
}