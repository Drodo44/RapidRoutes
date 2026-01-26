// components/MarketMap.js
import { useEffect, useState } from "react";
import supabase from "../utils/supabaseClient";

export default function MarketMap() {
  const [equipment, setEquipment] = useState("van");
  const [src, setSrc] = useState(null);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetchingMap, setFetchingMap] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("dat_maps")
        .select("*")
        .eq("equipment", equipment)
        .order("effective_date", { ascending: false })
        .limit(1);
      if (cancel) return;
      if (error || !data?.length) {
        setSrc(null);
        setDate("");
        setLoading(false);
        return;
      }
      const path = data[0].image_path;
      const pub = supabase.storage.from("dat_maps").getPublicUrl(path);
      setSrc(pub?.data?.publicUrl || pub?.publicUrl || null);
      setDate(data[0].effective_date);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [equipment]);
  
  // Function to manually fetch latest DAT maps
  const fetchLatestMaps = async () => {
    try {
      setFetchingMap(true);
      setFetchError(null);
      const response = await fetch('/api/fetchDatBlog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch market maps');
      }
      
      const result = await response.json();
      
      // Refresh the current view after successful fetch
      const { data } = await supabase
        .from("dat_maps")
        .select("*")
        .eq("equipment", equipment)
        .order("effective_date", { ascending: false })
        .limit(1);
        
      if (data?.length) {
        const path = data[0].image_path;
        const pub = supabase.storage.from("dat_maps").getPublicUrl(path);
        setSrc(pub?.data?.publicUrl || pub?.publicUrl || null);
        setDate(data[0].effective_date);
      }
    } catch (error) {
      setFetchError(error.message);
      console.error('Error fetching maps:', error);
    } finally {
      setFetchingMap(false);
    }
  };

  return (
    <div className="w-full rounded-xl border border-gray-700 bg-[#0f1115] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {["van", "reefer", "flatbed"].map((e) => (
            <button
              key={e}
              onClick={() => setEquipment(e)}
              className={`rounded px-3 py-1 ${equipment === e ? "bg-gray-700" : "bg-gray-800 hover:bg-gray-700"}`}
            >
              {e[0].toUpperCase() + e.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-400">
            {date ? `Updated: ${new Date(date).toLocaleDateString()}` : ""}
          </div>
          <button 
            onClick={fetchLatestMaps} 
            disabled={fetchingMap}
            className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white disabled:opacity-50"
          >
            {fetchingMap ? 'Updating...' : 'Update Maps'}
          </button>
        </div>
      </div>
      
      {fetchError && (
        <div className="mb-3 p-2 bg-red-900/30 border border-red-800 rounded text-sm text-red-300">
          {fetchError}
        </div>
      )}
      
      {loading ? (
        <div className="flex items-center justify-center p-10 text-sm text-gray-400">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading market data...
        </div>
      ) : src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img 
          src={src} 
          alt={`${equipment} heat map`} 
          className="w-full rounded-lg"
          onError={() => setSrc(null)}
        />
      ) : (
        <div className="text-center p-10 text-sm text-gray-400 border border-dashed border-gray-700 rounded-lg">
          <p className="mb-2">No market map available yet.</p>
          <p>Click "Update Maps" to fetch the latest map from DAT.</p>
        </div>
      )}
    </div>
  );
}
