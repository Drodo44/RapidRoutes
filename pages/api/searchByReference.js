// pages/api/searchByReference.js
// API endpoint to search for lanes by reference ID
import { adminSupabase } from '@/utils/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { referenceId } = req.query;

    if (!referenceId) {
      return res.status(400).json({ error: 'Reference ID is required' });
    }

    // Normalize reference ID: remove RR# prefix if present, trim whitespace
    let normalizedRef = referenceId.trim().toUpperCase();
    if (normalizedRef.startsWith('RR')) {
      normalizedRef = normalizedRef.substring(2);
    }
    normalizedRef = normalizedRef.replace(/[^0-9]/g, ''); // Keep only digits

    if (!normalizedRef) {
      return res.status(400).json({ error: 'Invalid reference ID format' });
    }

    // Search for lane by reference ID - use LIKE for partial matching
    const { data: lanes, error } = await adminSupabase
      .from('lanes')
      .select('*')
      .or(`reference_id.eq.${normalizedRef},reference_id.eq.RR${normalizedRef},reference_id.ilike.%${normalizedRef}%`)
      .limit(10);

    if (error) {
      throw error;
    }

    if (!lanes || lanes.length === 0) {
      return res.status(404).json({ error: 'Lane not found with that reference ID' });
    }

    // If multiple matches, return the best match or most recent
    const lane = lanes.find(l => 
      l.reference_id === normalizedRef || 
      l.reference_id === `RR${normalizedRef}`
    ) || lanes[0];

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
      totalPostings: postedPairs.length,
      allMatches: lanes.length > 1 ? lanes : undefined
    });

  } catch (error) {
    console.error('Reference search error:', error);
    return res.status(500).json({ error: error.message });
  }
}
