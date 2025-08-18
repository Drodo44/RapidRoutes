// pages/api/cities.js
import { adminSupabase as supabase } from "../../utils/supabaseClient.js";

export default async function handler(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    if (!q || q.length < 2) return res.status(200).json([]);

    const [rawCity, rawState] = q.split(",").map((s) => s?.trim() || "");
    const cityPrefix = rawCity;
    const statePrefix = (rawState || "").toUpperCase();

    let sel = supabase
      .from("cities")
      .select("id, city, state_or_province, state, zip, postal_code")
      .ilike("city", `${cityPrefix}%`)
      .order("city", { ascending: true })
      .limit(100);

    if (statePrefix) sel = sel.or(`state.ilike.${statePrefix}%,state_or_province.ilike.${statePrefix}%`);

    const { data, error } = await sel;
    if (error) throw error;

    const seen = new Set();
    const out = [];
    for (const r of data || []) {
      const state = r.state_or_province || r.state || "";
      const zip = r.zip || r.postal_code || "";
      const key = `${r.city}|${state}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ id: r.id, city: r.city, state, zip, label: `${r.city}, ${state}` });
      if (out.length >= 12) break;
    }

    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ error: e.message || "cities search failed" });
  }
}
