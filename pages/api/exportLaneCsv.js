// pages/api/exportLaneCsv.js
import { adminSupabase as supabase } from "../../utils/supabaseClient.js";
import { DAT_HEADERS, planPairsForLane, rowsFromBaseAndPairs, toCsv } from "../../lib/datCsvBuilder.js";

export default async function handler(req, res) {
  try {
    const id = String(req.query.id || "");
    const fill = req.query.fill === "1";
    if (!id) return res.status(400).json({ error: "id required" });

    const { data, error } = await supabase.from("lanes").select("*").eq("id", id).single();
    if (error) throw new Error(error.message || "lane not found");

    const plan = await planPairsForLane(data, { preferFillTo10: fill });
    const rows = rowsFromBaseAndPairs(data, plan.baseOrigin, plan.baseDest, plan.pairs);
    const csv = toCsv(DAT_HEADERS, rows);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="rapidroutes_DAT_lane_${id}.csv"`);
    return res.status(200).send(csv);
  } catch (e) {
    return res.status(500).json({ error: e.message || "exportLaneCsv failed" });
  }
}
