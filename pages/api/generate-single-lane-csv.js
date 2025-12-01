// pages/api/generate-single-lane-csv.js
// Generate DAT CSV export for a single lane
import { generateDatCsvRows, toCsv } from '@/lib/datCsvBuilder';
import { DAT_HEADERS } from '@/lib/datHeaders';
import { getAuthFromRequest } from '@/lib/auth';
import { getUserOrganizationId } from '@/lib/organizationHelper';
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const auth = await getAuthFromRequest(req, res);
    if (!auth) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { laneId } = req.body;
    if (!laneId) {
      return res.status(400).json({ error: 'Lane ID is required' });
    }

    // Fetch the lane
    const { data: lane, error: fetchError } = await supabaseAdmin
      .from('lanes')
      .select('*')
      .eq('id', laneId)
      .single();

    if (fetchError || !lane) {
      console.error('[generate-single-lane-csv] Lane fetch failed:', fetchError);
      return res.status(404).json({ error: 'Lane not found' });
    }

    // Verify user has access to this lane (organization check)
    const userId = auth.user?.id || auth.userId || auth.id;
    const userOrgId = await getUserOrganizationId(userId);
    const isAdmin = auth.profile?.role === 'Admin' || auth.user?.role === 'Admin';

    console.log('[generate-single-lane-csv] Auth check:', {
      userId,
      userOrgId,
      isAdmin,
      laneOrgId: lane.organization_id,
      userEmail: auth.user?.email || auth.profile?.email
    });

    // Non-admin users can only export their own organization's lanes
    if (!isAdmin && userOrgId && lane.organization_id !== userOrgId) {
      console.log('[generate-single-lane-csv] Access denied: user org', userOrgId, 'lane org', lane.organization_id);
      return res.status(403).json({ error: 'You do not have access to this lane' });
    }

    console.log(`[generate-single-lane-csv] Generating CSV for lane ${laneId}: ${lane.origin_city}, ${lane.origin_state} to ${lane.dest_city}, ${lane.dest_state}`);
    console.log(`[generate-single-lane-csv] Lane saved cities:`, {
      saved_origin_cities: lane.saved_origin_cities?.length || 0,
      saved_dest_cities: lane.saved_dest_cities?.length || 0,
      has_saved_origins: !!lane.saved_origin_cities,
      has_saved_dests: !!lane.saved_dest_cities
    });

    // Generate DAT CSV rows for this lane
    const rows = await generateDatCsvRows(lane);
    
    if (!rows || rows.length === 0) {
      return res.status(400).json({ 
        error: 'No CSV rows generated. Lane may be missing required data (saved cities, dates, weight, etc.)' 
      });
    }

    console.log(`[generate-single-lane-csv] Generated ${rows.length} rows for lane ${laneId}`);

    // Convert to CSV text
    const csvText = toCsv(DAT_HEADERS, rows);

    // Create filename: RR#_Origin-Dest_Equipment_Date.csv
    const refNumber = lane.reference_id || lane.id;
    const origin = lane.origin_city?.replace(/[^a-zA-Z0-9]/g, '') || 'Origin';
    const dest = lane.dest_city?.replace(/[^a-zA-Z0-9]/g, '') || 'Dest';
    const equipment = lane.equipment_code || 'FD';
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `RR${refNumber}_${origin}-${dest}_${equipment}_${date}.csv`;

    // Return CSV with proper headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvText);

  } catch (error) {
    console.error('[generate-single-lane-csv] Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate CSV', 
      message: error.message 
    });
  }
}
