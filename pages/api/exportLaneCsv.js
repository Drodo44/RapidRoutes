// pages/api/exportLaneCsv.js
import { supabase } from "../../utils/supabaseClient";
import { DAT_HEADERS } from "../../lib/datCsvBuilder";
import { planPairsForLane, rowsFromBaseAndPairs, toCsv } from "../../lib/datCsvBuilder";

export default async function handler(req, res) {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "Missing id" });

    const { data, error } = await supabase.from("lanes").select("*").eq("id", id).single();
    if (error || !data) return res.status(404).json({ error: "Lane not found" });

    const preferFillTo10 = req.query.fill === "1";
    const { baseOrigin, baseDest, pairs } = await planPairsForLane(data, { preferFillTo10 });
    const selected = pairs.slice(0, 10); // per-lane export: no cross-lane memory
    const rows = rowsFromBaseAndPairs(data, baseOrigin, baseDest, selected);

    const csv = toCsv(DAT_HEADERS, rows);
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="rapidroutes_DAT_lane_${id}_${ts}.csv"`);
    return res.status(200).send(csv);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Export failed" });
  }
}
