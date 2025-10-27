// pages/api/searchByReference.js
// API endpoint to search for lanes by reference ID


export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
    const { referenceId } = req.query;

    if (!referenceId) {
      return res.status(400).json({ error: 'Reference ID is required' });
    }

    // Search for lane by reference ID
    const { data: lane, error } = await adminSupabase
      .from('lanes')
      .select('*')
      .eq('reference_id', referenceId.toUpperCase())
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!lane) {
      return res.status(404).json({ error: 'Lane not found with that reference ID' });
    }

    // Get posted pairs for this lane from our posted_pairs table
    const { data: postedPairs = [], error: pairsError } = await adminSupabase
      .from('posted_pairs')
      .select('*')
      .eq('lane_id', lane.id)
      .order('posted_at', { ascending: false });

    if (pairsError) {
      console.warn('Error fetching posted pairs:', pairsError);
    }

    return res.status(200).json({
      lane,
      postedPairs,
      totalPostings: postedPairs.length
    });

  } catch (error) {
    console.error('Reference search error:', error);
    return res.status(500).json({ error: error.message });
  }
}
