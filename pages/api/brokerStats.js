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
    const { data: pendingLanesData, error: pendingLanesError, count: pendingLanesCount } = await adminSupabase
      .from('lanes')
      .select('*', { count: 'exact' })
  .eq('lane_status', 'pending');

    if (pendingLanesError) {
      console.error('❌ Error fetching pending lanes:', pendingLanesError);
      throw pendingLanesError;
    }

    const { data: postedLanesData, error: postedLanesError, count: postedLanesCount } = await adminSupabase
      .from('lanes')
      .select('*', { count: 'exact' })
  .eq('lane_status', 'posted');

    if (postedLanesError) {
      console.error('❌ Error fetching posted lanes:', postedLanesError);
      throw postedLanesError;
    }

    const { data: coveredLanesData, error: coveredLanesError, count: coveredLanesCount } = await adminSupabase
      .from('lanes')
      .select('*', { count: 'exact' })
  .eq('lane_status', 'covered');

    if (coveredLanesError) {
      console.error('❌ Error fetching covered lanes:', coveredLanesError);
      throw coveredLanesError;
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
      pendingLanes: pendingLanesCount || 0,
      postedLanes: postedLanesCount || 0,
      coveredLanes: coveredLanesCount || 0,
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
