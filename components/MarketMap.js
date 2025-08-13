// components/MarketMap.js
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function MarketMap() {
  const [equipment, setEquipment] = useState("van");
  const [src, setSrc] = useState(null);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="w-full rounded-xl border border-gray-700 bg-[#0f1115] p-4">
      <div className="mb-3 flex items-center gap-2">
        {["van", "reefer", "flatbed"].map((e) => (
          <button
            key={e}
            onClick={() => setEquipment(e)}
            className={`rounded px-3 py-1 ${equipment === e ? "bg-gray-700" : "bg-gray-800 hover:bg-gray-700"}`}
          >
            {e[0].toUpperCase() + e.slice(1)}
          </button>
        ))}
        <div className="ml-auto text-xs text-gray-400">
          Sourced from DAT Blog — Updated Weekly {date ? `(${date})` : ""}
        </div>
      </div>
      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`${equipment} heat map`} className="w-full rounded-lg" />
      ) : (
        <div className="text-sm text-gray-400">No map available yet.</div>
      )}
    </div>
  );
}
