// pages/api/exportDatCsv.js
// GET => returns CSV part (supports ?part=1..N, ?days=N, ?fill=1).
// HEAD => only sets X-Total-Parts (so UI can know how many files to download).
import { supabase } from "../../utils/supabaseClient";
import { DAT_HEADERS, rowsForLane, toCsv, chunkRows } from "../../utils/datExport";

async function buildAllRows(req) {
  const preferFillTo10 = req.query.fill === "1";
  const days = Number(req.query.days || 0);

  let q = supabase.from("lanes").select("*");
  if (Number.isFinite(days) && days > 0) {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    q = q.gte("created_at", since);
  }
  const { data: lanes, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;

  const all = [];
  const audits = [];
  for (const lane of lanes || []) {
    const { rows, totalPostings, allowedDuplicates, shortfallReason } = await rowsForLane(lane, { preferFillTo10 });
    all.push(...rows);
    if (totalPostings - 1 < 10) {
      audits.push({
        lane_id: lane.id,
        attempted_pairs: 10,
        produced_pairs: totalPostings - 1,
        allowed_duplicates: allowedDuplicates,
        top_reason: shortfallReason || null,
        reasons: shortfallReason ? [shortfallReason] : [],
      });
    }
  }

  // Best-effort audit insert (won't break export if table missing)
  if (audits.length) {
    try { await supabase.from("generation_audit").insert(audits); } catch (_) {}
  }

  return all;
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const allRows = await buildAllRows(req);
    const chunks = chunkRows(allRows, 499);
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
