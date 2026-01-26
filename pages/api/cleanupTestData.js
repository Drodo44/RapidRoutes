// pages/api/cleanupTestData.js
// Remove test lanes and data for production cleanup


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
    // Delete lanes that contain test indicators
    const { data: deletedLanes, error: lanesError } = await adminSupabase
      .from('lanes')
      .delete()
      .or(`comment.ilike.%test%,commodity.ilike.%test%,origin_city.eq.Los Angeles,origin_city.eq.Dallas,origin_city.eq.Augusta,origin_city.eq.Maplesville,origin_city.eq.McDavid`)
      .select('id');

    if (lanesError) throw lanesError;

    // Delete related recap tracking data
    if (deletedLanes?.length > 0) {
      const laneIds = deletedLanes.map(l => l.id);
      await adminSupabase
        .from('recap_tracking')
        .delete()
        .in('lane_id', laneIds);
    }

    return res.status(200).json({
      success: true,
      deletedLanes: deletedLanes?.length || 0,
      message: 'Test data cleaned up successfully'
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return res.status(500).json({ error: error.message });
  }
}
