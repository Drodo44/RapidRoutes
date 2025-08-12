// pages/api/exportDatCsv.js
import { supabase } from "../../utils/supabaseClient";
import { DAT_HEADERS } from "../../lib/datHeaders";
import { buildRowsForLane, toCsv, chunkRows } from "../../lib/datCsvBuilder";

async function collectRows(req) {
  const preferFillTo10 = req.query.fill === "1";
  const days = Number(req.query.days || 0);

  let q = supabase.from("lanes").select("*").eq("status", "active");
  if (Number.isFinite(days) && days > 0) {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    q = q.gte("created_at", since);
  }
  const { data: lanes, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;

  const all = [];
  for (const lane of lanes || []) {
    const { rows } = await buildRowsForLane(lane, { preferFillTo10 });
    all.push(...rows);
  }
  return all;
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const rows = await collectRows(req);
    const chunks = chunkRows(rows, 499);
    const totalParts = Math.max(1, chunks.length);
    res.setHeader("X-Total-Parts", String(totalParts));

    if (req.method === "HEAD") return res.status(200).end();

    const part = Math.min(Math.max(1, Number(req.query.part || 1)), totalParts);
    const csv = toCsv(DAT_HEADERS, chunks[part - 1] || []);
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="rapidroutes_DAT_${ts}_part${part}.csv"`);
    return res.status(200).send(csv);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Export failed" });
  }
}
