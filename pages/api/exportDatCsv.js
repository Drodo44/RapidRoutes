// pages/api/exportDatCsv.js
// Run-level KMA variety: avoids reusing the same pickup/delivery KMAs across
// multiple lanes that share the same base origin/dest in a single export run.
import { supabase } from "../../utils/supabaseClient";
import { DAT_HEADERS, planPairsForLane, rowsFromBaseAndPairs, toCsv, chunkRows } from "../../lib/datCsvBuilder";

function inc(map, baseKey, kma) {
  const byBase = map.get(baseKey) || new Map();
  const count = byBase.get(kma) || 0;
  byBase.set(kma, count + 1);
  map.set(baseKey, byBase);
}
function get(map, baseKey, kma) {
  const byBase = map.get(baseKey);
  return byBase ? byBase.get(kma) || 0 : 0;
}

async function fetchLanes(req) {
  const days = Number(req.query.days || 0);
  const includeAll = req.query.all === "1";

  let q = supabase.from("lanes").select("*");
  if (Number.isFinite(days) && days > 0) {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    q = q.gte("created_at", since);
  }

  // Prefer status='active' if the column exists; fall back if not.
  const tryActive = includeAll ? null : await q.eq("status", "active").order("created_at", { ascending: false });
  if (tryActive && !tryActive.error) return tryActive.data ?? [];

  const plain = await supabase.from("lanes").select("*").order("created_at", { ascending: false });
  if (plain.error) throw plain.error;
  return plain.data ?? [];
}

async function buildAllRows(req) {
  const preferFillTo10 = req.query.fill === "1";

  const lanes = await fetchLanes(req);

  // Run-memory to reduce repetition across lanes:
  // key by base KMA -> map of candidate KMA -> count used in this export run
  const usedPickupByBase = new Map();   // Map<string, Map<string, number>>
  const usedDeliveryByBase = new Map(); // Map<string, Map<string, number>>

  const rows = [];

  for (const lane of lanes) {
    const { baseOrigin, baseDest, pairs } = await planPairsForLane(lane, { preferFillTo10 });

    const baseOK = baseOrigin?.kma || `${baseOrigin.city}-${baseOrigin.state}`;
    const baseDK = baseDest?.kma || `${baseDest.city}-${baseDest.state}`;

    const strictCap = 0;  // strict: never reuse a KMA across lanes with same base
    const relaxedCap = 1; // relaxed: allow at most one reuse across the whole run

    // Pass 1: pick only pairs with completely new pickup+delivery KMAs for this base
    const selected = [];
    for (const p of pairs) {
      const pK = p.pickup.kma || `${p.pickup.city}-${p.pickup.state}`;
      const dK = p.delivery.kma || `${p.delivery.city}-${p.delivery.state}`;
      if (get(usedPickupByBase, baseOK, pK) <= strictCap - 0 && get(usedDeliveryByBase, baseDK, dK) <= strictCap - 0) {
        selected.push(p);
        inc(usedPickupByBase, baseOK, pK);
        inc(usedDeliveryByBase, baseDK, dK);
      }
      if (selected.length === 10) break;
    }

    // Pass 2 (only if ?fill=1): allow 1 reuse per KMA across the run
    if (selected.length < 10 && preferFillTo10) {
      for (const p of pairs) {
        if (selected.includes(p)) continue;
        const pK = p.pickup.kma || `${p.pickup.city}-${p.pickup.state}`;
        const dK = p.delivery.kma || `${p.delivery.city}-${p.delivery.state}`;
        if (get(usedPickupByBase, baseOK, pK) <= relaxedCap && get(usedDeliveryByBase, baseDK, dK) <= relaxedCap) {
          selected.push(p);
          inc(usedPickupByBase, baseOK, pK);
          inc(usedDeliveryByBase, baseDK, dK);
        }
        if (selected.length === 10) break;
      }
    }

    const laneRows = rowsFromBaseAndPairs(lane, baseOrigin, baseDest, selected);
    rows.push(...laneRows);
  }

  return rows;
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
