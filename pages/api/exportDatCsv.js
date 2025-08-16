// pages/api/exportDatCsv.js
import { adminSupabase as supabase } from "../../utils/supabaseClient.js";
import { DAT_HEADERS, planPairsForLane, rowsFromBaseAndPairs, toCsv, chunkRows } from "../../lib/datCsvBuilder.js";

function filenameBase() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `rapidroutes_DAT_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

async function fetchLanes(q) {
  const tryQuery = async (builder) => {
    const { data, error } = await builder;
    if (error) throw error;
    return data || [];
  };

  // Default: Pending only; if "status" column doesn't exist, fall back to all rows.
  try {
    if (q.pending === "1") {
      return await tryQuery(supabase.from("lanes").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(1000));
    }
    if (q.days) {
      const days = Math.max(1, Math.min(90, Number(q.days) || 7));
      const since = new Date(Date.now() - days * 86400_000).toISOString();
      return await tryQuery(
        supabase.from("lanes").select("*").gte("created_at", since).neq("status", "covered").order("created_at", { ascending: false }).limit(1000)
      );
    }
    if (q.all === "1") {
      return await tryQuery(supabase.from("lanes").select("*").neq("status", "covered").order("created_at", { ascending: false }).limit(1000));
    }
    return await tryQuery(supabase.from("lanes").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(1000));
  } catch {
    // status column missing: export everything
    const { data } = await supabase.from("lanes").select("*").order("created_at", { ascending: false }).limit(1000);
    return data || [];
  }
}

export default async function handler(req, res) {
  try {
    const q = req.query || {};
    const fill = q.fill === "1";
    const lanes = await fetchLanes(q);

    const allRows = [];
    for (const lane of lanes) {
      const plan = await planPairsForLane(lane, { preferFillTo10: fill });
      const rows = rowsFromBaseAndPairs(lane, plan.baseOrigin, plan.baseDest, plan.pairs);
      allRows.push(...rows);
    }

    const parts = chunkRows(allRows, 499);
    const totalParts = Math.max(1, parts.length);

    if (req.method === "HEAD") {
      res.setHeader("X-Total-Parts", String(totalParts));
      return res.status(200).end();
    }

    const part = Math.max(1, Math.min(totalParts, Number(q.part) || 1));
    const csv = toCsv(DAT_HEADERS, parts[part - 1] || []);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filenameBase()}_part${part}-of-${totalParts}.csv"`);
    return res.status(200).send(csv);
  } catch (e) {
    return res.status(500).json({ error: e.message || "export failed" });
  }
}
