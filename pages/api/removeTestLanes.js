// pages/api/removeTestLanes.js
// Remove test lanes that contain "Test lane" in the comment field

import { adminSupabase } from '../../utils/supabaseAdminClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Find and delete test lanes
    const { data: testLanes, error: findError } = await adminSupabase
      .from('lanes')
      .select('id, origin_city, dest_city, comment')
      .or('comment.ilike.%test lane%,comment.ilike.%Test lane%');

    if (findError) throw findError;

    if (!testLanes || testLanes.length === 0) {
      return res.status(200).json({ 
        message: 'No test lanes found',
        deleted: 0 
      });
    }

    // Delete the test lanes
    const { error: deleteError } = await adminSupabase
      .from('lanes')
      .delete()
      .in('id', testLanes.map(l => l.id));

    if (deleteError) throw deleteError;

    return res.status(200).json({
      message: `Successfully deleted ${testLanes.length} test lanes`,
      deleted: testLanes.length,
      lanes: testLanes.map(l => `${l.origin_city} -> ${l.dest_city}`)
    });

  } catch (error) {
    console.error('Error removing test lanes:', error);
    return res.status(500).json({ error: error.message });
  }
}
