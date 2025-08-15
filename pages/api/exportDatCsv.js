// file: pages/api/exportDatCsv.js  (REPLACE)
// Streams CSV for Pending (default), or by ?days=7, or ?all=1.
// Splits into 499-row parts; HEAD returns X-Total-Parts.
import { adminSupabase as supabase } from "../../utils/supabaseClient.js";
import {
  DAT_HEADERS,
  planPairsForLane,
  rowsFromBaseAndPairs,
  toCsv,
  chunkRows,
} from "../../lib/datCsvBuilder.js";

function filenameBase() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `rapidroutes_DAT_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

async function fetchLanes(q) {
  let sel = supabase.from("lanes").select("*");
  if (q.pending === "1") {
    sel = sel.eq("status", "pending");
  } else if (q.days) {
    const days = Math.max(1, Math.min(90, Number(q.days) || 7));
    sel = sel.gte("created_at", new Date(Date.now() - days * 86400_000).toISOString())
             .neq("status", "covered");
  } else if (q.all === "1") {
    // export everything except covered, to be safe
    sel = sel.neq("status", "covered");
  } else {
    // Default: Pending only
    sel = sel.eq("status", "pending");
  }
  sel = sel.order("created_at", { ascending: false }).limit(1000);
  const { data, error } = await sel;
  if (error) throw new Error(error.message);
  return data || [];
}

export default async function handler(req, res) {
  try {
    const q = req.query || {};
    const fill = q.fill === "1";
    const lanes = await fetchLanes(q);

    // Build rows by lane
    const allRows = [];
    for (const lane of lanes) {
      const plan = await planPairsForLane(lane, { preferFillTo10: fill });
      const rows = rowsFromBaseAndPairs(lane, plan.baseOrigin, plan.baseDest, plan.pairs);
      allRows.push(...rows);
    }

    const parts = chunkRows(allRows, 499);
    const totalParts = Math.max(1, parts.length);

    // HEAD: just expose parts count
    if (req.method === "HEAD") {
      res.setHeader("X-Total-Parts", String(totalParts));
      return res.status(200).end();
    }

    // GET: return specific part
    const part = Math.max(1, Math.min(totalParts, Number(q.part) || 1));
    const csv = toCsv(DAT_HEADERS, parts[part - 1] || []);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filenameBase()}_part${part}-of-${totalParts}.csv"`
    );
    res.status(200).send(csv);
  } catch (e) {
    res.status(500).json({ error: e.message || "export failed" });
  }
}
