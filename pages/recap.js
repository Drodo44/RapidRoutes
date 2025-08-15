// pages/recap.js
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { supabase } from "../utils/supabaseClient.js";
import RecapExportButtons from "../components/RecapExportButtons.js";
import LaneRecapCard from "../components/LaneRecapCard.js";

export default function RecapPage() {
  const [lanes, setLanes] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true); setErr("");
    try {
      const { data, error } = await supabase
        .from("lanes")
        .select("id, origin, origin_state, origin_zip, destination, dest_state, dest_zip, equipment, length, randomize_weight, weight, weight_min, weight_max, pickup_earliest, pickup_latest, full_partial, commodity, comment, created_at, status")
        .in("status", ["pending", "posted"])
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      setLanes(data || []);
    } catch (e) {
      setErr(e.message || "Failed to load lanes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    try {
      const ch = supabase
        .channel("recap_active_changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "lanes" }, load)
        .subscribe();
      return () => { try { supabase.removeChannel(ch); } catch {} };
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return lanes;
    return lanes.filter((x) =>
      `${x.origin} ${x.origin_state} ${x.destination} ${x.dest_state} ${x.equipment}`.toLowerCase().includes(t)
    );
  }, [lanes, q]);

  return (
    <>
      <Head><title>Recap — RapidRoutes</title></Head>
      <main className="mx-auto max-w-6xl p-6 text-gray-100">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Recap (Active only)</h1>
          <RecapExportButtons lanes={filtered} />
        </div>

        <div className="mb-4 flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search city, state, equipment…"
            className="w-80 rounded-lg border border-gray-700 bg-gray-900 p-2 text-white"
          />
          <button
            onClick={load}
            className="rounded bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600"
          >
            Refresh
          </button>
        </div>

        {loading && <div className="mb-3 text-sm text-gray-300">Loading…</div>}
        {err && <div className="mb-3 text-sm text-red-400">{err}</div>}
        {!loading && !err && filtered.length === 0 && (
          <div className="text-sm text-gray-300">No active lanes (pending/posted).</div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((lane) => (
            <LaneRecapCard key={lane.id} lane={lane} />
          ))}
        </div>
      </main>
    </>
  );
}
