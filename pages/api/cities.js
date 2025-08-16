// pages/api/cities.js
import { adminSupabase as supabase } from "../../utils/supabaseClient.js";

export default async function handler(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    if (!q || q.length < 2) return res.status(200).json([]);

    // If user typed "City, ST" split both parts
    const [rawCity, rawState] = q.split(",").map((s) => s?.trim() || "");
    const cityPrefix = rawCity;
    const statePrefix = (rawState || "").toUpperCase();

    let sel = supabase
      .from("cities")
      .select("id, city, state_or_province, zip")
      .ilike("city", `${cityPrefix}%`)
      .order("city", { ascending: true })
      .limit(50);

    if (statePrefix) sel = sel.ilike("state_or_province", `${statePrefix}%`);

    const { data, error } = await sel;
    if (error) throw error;

    // Deduplicate City+State; prefer rows with a ZIP present
    const seen = new Set();
    const out = [];
    for (const r of data || []) {
      const key = `${r.city}|${r.state_or_province}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: r.id,
        city: r.city,
        state: r.state_or_province,
        zip: r.zip || "",
        label: `${r.city}, ${r.state_or_province}`,
      });
      if (out.length >= 12) break;
    }

    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ error: e.message || "cities search failed" });
  }
}
