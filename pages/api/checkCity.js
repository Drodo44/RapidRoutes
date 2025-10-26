// Quick city checker
import supabaseAdmin from "@/lib/supabaseAdmin";

export default async function handler(req, res) {
  const { city, state } = req.query;
  
  try {
    const { data: exact } = await supabaseAdmin
      .from('cities')
      .select('city, state_or_province, zip')
      .ilike('city', city)
      .ilike('state_or_province', state)
      .limit(5);
    
    const { data: partial } = await supabaseAdmin
      .from('cities')
      .select('city, state_or_province, zip')
      .ilike('state_or_province', state)
      .ilike('city', `${city}%`)
      .limit(10);
    
    res.json({ exact, partial });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
