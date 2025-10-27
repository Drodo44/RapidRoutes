// pages/api/admin/equipment/[code].js
const supabase = supabaseAdmin;

export default async function handler(req, res) {
  let supabaseAdmin;
  try {
    supabaseAdmin = (await import(\'@/lib/supabaseAdmin\')).default;
  } catch (importErr) {
    return res.status(500).json({ error: \'Admin client initialization failed\' });
  }

  const codeParam = String(req.query.code || "");
  if (!codeParam) return res.status(400).json({ error: "Missing code" });

  try {
    if (req.method === "PUT") {
      const { code, label, group } = req.body || {};
      if (!code || !label) return res.status(400).json({ error: "code and label required" });

      // Upsert with potential primary-key change: delete old if changed
      if (code.toUpperCase() !== codeParam.toUpperCase()) {
        // insert new
        const { error: e1 } = await supabase.from("equipment_codes").upsert({
          code: code.toUpperCase(), label, group: group || "Other"
        });
        if (e1) throw e1;
        // delete old
        await supabase.from("equipment_codes").delete().eq("code", codeParam.toUpperCase());
      } else {
        const { error } = await supabase
          .from("equipment_codes")
          .upsert({ code: code.toUpperCase(), label, group: group || "Other" });
        if (error) throw error;
      }
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const { error } = await supabase.from("equipment_codes").delete().eq("code", codeParam.toUpperCase());
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "PUT, DELETE");
    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (e) {
    return res.status(500).json({ error: e.message || "equipment item failed" });
  }
}
