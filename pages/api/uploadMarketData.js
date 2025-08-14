// pages/api/uploadMarketData.js
import { adminSupabase as supabase } from "../../utils/supabaseClient.js";

function flattenMatrix(matrix, snapshot_id, equipment, source) {
  const rows = [];
  for (const [origin, dests] of Object.entries(matrix || {})) {
    for (const [destination, rate] of Object.entries(dests || {})) {
      const num = Number(rate);
      if (Number.isFinite(num)) rows.push({ snapshot_id, equipment, source, origin, destination, rate: num });
    }
  }
  return rows;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const { entries, flatten } = req.body || {};
    if (!Array.isArray(entries) || !entries.length) return res.status(400).json({ error: "Missing entries" });

    let inserted = 0;
    for (const e of entries) {
      const equipment = String(e.equipment || "").toLowerCase();
      const level = String(e.level || "").toLowerCase();
      const source = String(e.source || "").toLowerCase();
      if (!["van", "reefer", "flatbed"].includes(equipment)) throw new Error("Invalid equipment");
      if (!["state", "region"].includes(level)) throw new Error("Invalid level");
      if (!["spot", "contract"].includes(source)) throw new Error("Invalid source");
      if (!e.matrix || typeof e.matrix !== "object") throw new Error("Invalid matrix");

      const { data: snap, error: err1 } = await supabase
        .from("rates_snapshots")
        .insert({ equipment, level, source, matrix: e.matrix })
        .select("id")
        .single();
      if (err1) throw err1;
      inserted++;

      if (flatten) {
        const rows = flattenMatrix(e.matrix, snap.id, equipment, source);
        if (rows.length) {
          const { error: err2 } = await supabase.from("rates_flat").insert(rows);
          if (err2) throw err2;
        }
      }
    }

    await supabase.from("settings").upsert({ key: "rates_last_updated", value: { ts: new Date().toISOString() } });
    return res.status(200).json({ ok: true, inserted });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Upload failed" });
  }
}
