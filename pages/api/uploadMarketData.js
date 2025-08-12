// pages/api/uploadMarketData.js
import Papa from "papaparse";
import { supabase } from "../../utils/supabaseClient";

export const config = { api: { bodyParser: { sizeLimit: "20mb" } } };

function parseCsv(text) {
  if (!text) return [];
  const out = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (out.errors?.length) throw new Error(out.errors[0].message);
  return out.data;
}

// Build state→state matrix from CSV: first col = origin (e.g., "CA"), headers = destination states.
function matrixFromCsv(rows) {
  const matrix = {};
  if (!rows.length) return matrix;
  const headers = Object.keys(rows[0] || {});
  const originKey = headers[0];
  const dests = headers.slice(1);
  for (const r of rows) {
    const o = String(r[originKey] || "").toUpperCase();
    if (!o) continue;
    matrix[o] = {};
    for (const d of dests) {
      const v = Number(r[d]);
      if (Number.isFinite(v)) matrix[o][String(d).toUpperCase()] = v;
    }
  }
  return matrix;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const { spotCsv, contractCsv, flatCsv, equipment } = req.body || {};
    if (!equipment || !["van", "reefer", "flatbed"].includes(equipment)) {
      return res.status(400).json({ error: "Invalid equipment" });
    }

    const inserts = [];

    if (spotCsv) {
      const rows = parseCsv(spotCsv);
      inserts.push({ equipment, level: "state", source: "spot", matrix: matrixFromCsv(rows) });
    }
    if (contractCsv) {
      const rows = parseCsv(contractCsv);
      inserts.push({ equipment, level: "state", source: "contract", matrix: matrixFromCsv(rows) });
    }

    if (inserts.length) {
      const { error } = await supabase.from("rates_snapshots").insert(inserts);
      if (error) throw error;
    }

    if (flatCsv) {
      const rows = parseCsv(flatCsv);
      const flat = rows
        .map((r) => ({
          equipment,
          source: "spot",
          origin: String(r.origin || r.Origin || "").toUpperCase(),
          destination: String(r.destination || r.Destination || "").toUpperCase(),
          rate: Number(r.rate || r.Rate),
        }))
        .filter((r) => r.origin && r.destination && Number.isFinite(r.rate));
      if (flat.length) {
        const { error } = await supabase.from("rates_flat").insert(flat);
        if (error) throw error;
      }
    }

    await supabase.from("settings").upsert({ key: "rates_last_updated", value: { ts: Date.now() } });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Upload failed" });
  }
}
