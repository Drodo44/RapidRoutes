// pages/api/posted-pairs.js
// Track generated RR numbers for search functionality

import { validateApiAuth } from '../../middleware/auth.unified';

export default async function handler(req, res) {
  // Validate authentication for all requests
  const auth = await validateApiAuth(req, res);
  if (!auth) return;

  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
  } catch (importErr) {
    return res.status(500).json({ error: 'Admin client initialization failed' });
  }

  if (req.method === 'POST') {
    return handleCreatePostedPairs(req, res, auth, supabaseAdmin);
  } else if (req.method === 'GET') {
    return handleSearchPostedPairs(req, res, auth, supabaseAdmin);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleCreatePostedPairs(req, res, auth, supabaseAdmin) {
  try {

    const { lane_id, pairs } = req.body;
    
    if (!lane_id || !Array.isArray(pairs)) {
      return res.status(400).json({ error: 'lane_id and pairs array required' });
    }

    // Insert all posted pairs for this lane
    const postedPairs = pairs.map(pair => ({
      lane_id,
      reference_id: pair.reference_id,
      origin_city: pair.origin_city,
      origin_state: pair.origin_state,
      dest_city: pair.dest_city,
      dest_state: pair.dest_state,
      created_by: auth.user.id
    }));

    const { data, error } = await adminSupabase
      .from('posted_pairs')
      .insert(postedPairs)
      .select();

    if (error) {
      console.error('Error inserting posted pairs:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ data });
  } catch (error) {
    console.error('Posted pairs creation error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function handleSearchPostedPairs(req, res, auth, supabaseAdmin) {
  try {

    const { reference_id } = req.query;
    
    if (!reference_id) {
      return res.status(400).json({ error: 'reference_id query parameter required' });
    }

    // Search for posted pairs by reference ID
    const { data: pairs, error } = await adminSupabase
      .from('posted_pairs')
      .select(`
        *,
        lanes!inner(*)
      `)
      .eq('reference_id', reference_id)
      .eq('created_by', auth.user.id);

    if (error) {
      console.error('Error searching posted pairs:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ data: pairs });
  } catch (error) {
    console.error('Posted pairs search error:', error);
    res.status(500).json({ error: error.message });
  }
}
