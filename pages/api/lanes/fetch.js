// pages/api/lanes/fetch.js
// ✅ SERVER-ONLY: Never runs in browser

export default async function handler(req, res) {
  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
    const { equipment } = req.query;

    const { data, error } = await supabaseAdmin
      .from('lanes')
      .select('*')
      .ilike('equipment', equipment || '%')
      .limit(500);

    if (error) throw error;

    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error('[API /lanes/fetch] ERROR:', err.message);
    return res.status(500).json({ ok: false, message: err.message });
  }
}
