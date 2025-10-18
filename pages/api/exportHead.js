// pages/api/exportHead.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    const { data, error } = await supabase
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
