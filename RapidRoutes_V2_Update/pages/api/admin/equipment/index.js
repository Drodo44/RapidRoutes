// pages/api/admin/equipment/index.js
const supabase = supabaseAdmin;

export default async function handler(req, res) {
  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
    if (req.method === "GET") {
      const { data, error } = await supabase.from("equipment_codes").select("*").order("code", { ascending: true });
      if (error) throw error;
      return res.status(200).json({ items: data || [] });
    }

    if (req.method === "POST") {
      const { code, label, group } = req.body || {};
      if (!code || !label) return res.status(400).json({ error: "code and label required" });
      const { error } = await supabase.from("equipment_codes").upsert({ code: code.toUpperCase(), label, group: group || "Other" });
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (e) {
    return res.status(500).json({ error: e.message || "equipment index failed" });
  }
}
