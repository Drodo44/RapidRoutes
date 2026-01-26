// pages/api/cache-zip3.js

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
    const { city, state, zip3 } = req.body || {};
    const c = (city || "").trim();
    const s = (state || "").trim().toUpperCase();
    const z = (zip3 || "").trim();

    if (!c || !s || !z || z.length !== 3) {
      return res.status(400).json({ error: "Missing/invalid: city, state, zip3" });
    }

    const { error } = await supabaseAdmin
      .from("zip3s")
      .upsert({ city: c, state: s, zip3: z }, { onConflict: "city,state" });

    if (error) {
      console.error("[cache-zip3] Upsert error:", error);
      return res.status(500).json({ error: "Database upsert failed" });
    }

    return res.status(200).json({ success: true, city: c, state: s, zip3: z });
  } catch (err) {
    console.error("[cache-zip3] Unexpected error:", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}
