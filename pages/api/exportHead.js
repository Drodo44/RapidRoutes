// pages/api/exportHead.js

export default async function handler(req, res) {
  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;

    const { data, error } = await supabaseAdmin
      .from('lanes')
      .select('id, origin_city, dest_city, origin_kma, dest_kma, date')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    res.status(200).json({
      ok: true,
      count: data.length,
      lanes: data
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      message: err.message
    });
  }
}
