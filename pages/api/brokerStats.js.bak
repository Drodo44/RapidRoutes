import { adminSupabase } from '../../utils/supabaseAdminClient';
import { countLaneRecords } from '../../services/laneService.js';
import { assertApiAuth, isInternalBypass } from '@/lib/auth';
import { validateApiAuth } from '../../middleware/auth.unified';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    try {
      assertApiAuth(req);
    } catch (error) {
      const status = Number(error?.status) || 401;
      return res.status(status).json({ error: error?.message || 'Unauthorized' });
    }

    if (!isInternalBypass(req)) {
      const authenticated = await validateApiAuth(req, res);
      if (!authenticated) {
        return;
      }
    }

    console.log('🔍 Fetching broker stats...');

    // Aggregate lane counts via rapidroutes_lane_view
    const totalLanesCount = await countLaneRecords({ status: 'all', includeArchived: true }, adminSupabase);
    const currentLanesCount = await countLaneRecords({ status: 'current', includeArchived: false }, adminSupabase);
    const archiveLanesCount = await countLaneRecords({ status: 'archive', includeArchived: true }, adminSupabase);

    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setUTCHours(23, 59, 59, 999);

    const todayLanesCount = await countLaneRecords(
      {
        status: 'all',
        includeArchived: true,
        createdAfter: startOfToday,
        createdBefore: endOfToday
      },
      adminSupabase
    );

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
      totalRecaps: totalRecaps || 0
    };

    console.log('✅ Broker stats retrieved:', stats);

    res.status(200).json(stats);

  } catch (error) {
    console.error('❌ Error in brokerStats API:', error);
    res.status(500).json({ 
      error: 'Failed to fetch broker stats'
    });
  }
}
