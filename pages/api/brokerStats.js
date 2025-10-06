import { adminSupabase } from '../../utils/supabaseAdminClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Fetching broker stats...');

    // Get total lanes posted
    const { data: totalLanesData, error: totalLanesError, count: totalLanesCount } = await adminSupabase
      .from('lanes')
      .select('*', { count: 'exact' });

    if (totalLanesError) {
      console.error('❌ Error fetching total lanes:', totalLanesError);
      throw totalLanesError;
    }

    // Get lanes posted today
    const today = new Date().toISOString().split('T')[0];
    const { data: todayLanesData, error: todayLanesError, count: todayLanesCount } = await adminSupabase
      .from('lanes')
      .select('*', { count: 'exact' })
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`);

    if (todayLanesError) {
      console.error('❌ Error fetching today lanes:', todayLanesError);
      throw todayLanesError;
    }

    // Get lanes by status
    const { data: currentLanesData, error: currentLanesError, count: currentLanesCount } = await adminSupabase
      .from('lanes')
      .select('*', { count: 'exact' })
  .eq('lane_status', 'current');

    if (currentLanesError) {
      console.error('❌ Error fetching current lanes:', currentLanesError);
      throw currentLanesError;
    }

    const { data: archiveLanesData, error: archiveLanesError, count: archiveLanesCount } = await adminSupabase
      .from('lanes')
      .select('*', { count: 'exact' })
  .eq('lane_status', 'archive');

    if (archiveLanesError) {
      console.error('❌ Error fetching archive lanes:', archiveLanesError);
      throw archiveLanesError;
    }

    const { data: allLanesData, error: allLanesError, count: allLanesCount } = await adminSupabase
      .from('lanes')
      .select('*', { count: 'exact' });

    if (coveredLanesError) {
      console.error('❌ Error fetching covered lanes:', coveredLanesError);
      throw allLanesError;
    }

    // Get total recaps (gracefully handle if table doesn't exist)
    let totalRecaps = 0;
    try {
      const { data: recapData, error: recapError, count: recapCount } = await adminSupabase
        .from('recap_tracking')
        .select('*', { count: 'exact' });

      if (recapError && !recapError.message.includes('does not exist')) {
        console.error('❌ Error fetching recaps:', recapError);
        throw recapError;
      }
      
      totalRecaps = recapCount || 0;
    } catch (error) {
      console.log('⚠️ recap_tracking table not found, defaulting to 0');
      totalRecaps = 0;
    }

    const stats = {
      totalLanes: totalLanesCount || 0,
      todayLanes: todayLanesCount || 0,
      currentLanes: currentLanesCount || 0,
      archiveLanes: archiveLanesCount || 0,
      totalLanes: allLanesCount || 0,
      totalRecaps: totalRecaps || 0
    };

    console.log('✅ Broker stats retrieved:', stats);

    res.status(200).json(stats);

  } catch (error) {
    console.error('❌ Error in brokerStats API:', error);
    res.status(500).json({ 
      error: 'Failed to fetch broker stats',
      details: error.message 
    });
  }
}
