// pages/api/exportSavedCitiesCsv.js
// Export DAT CSV for lanes with saved city selections (one-to-one pairing)

import { DAT_HEADERS } from '../../lib/datCsvBuilder.js';
import { getAuthFromRequest } from '@/lib/auth';
import { getUserOrganizationId } from '@/lib/organizationHelper';
import { format } from 'date-fns';

// Normalize state to 2-letter code (DAT requires exact 2-letter state codes)
function normalizeStateCode(state) {
  if (!state) return '';

  const stateStr = String(state).trim().toUpperCase();

  // If already 2 letters, return as-is
  if (stateStr.length === 2) return stateStr;

  // Map full state names to codes
  const stateMap = {
    'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR',
    'CALIFORNIA': 'CA', 'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE',
    'FLORIDA': 'FL', 'GEORGIA': 'GA', 'HAWAII': 'HI', 'IDAHO': 'ID',
    'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA', 'KANSAS': 'KS',
    'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
    'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS',
    'MISSOURI': 'MO', 'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV',
    'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY',
    'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH', 'OKLAHOMA': 'OK',
    'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
    'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT',
    'VERMONT': 'VT', 'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV',
    'WISCONSIN': 'WI', 'WYOMING': 'WY', 'DISTRICT OF COLUMBIA': 'DC'
  };

  return stateMap[stateStr] || stateStr;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get contact method parameter (both, email, or phone)
  const contactMethod = req.query.contactMethod || 'both';

  // Get optional laneIds for selective export
  const laneIds = req.query.laneIds ? req.query.laneIds.split(',').filter(id => id.trim()) : [];

  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
  } catch (error) {
    console.error('[exportSavedCitiesCsv] Failed to load supabase admin:', error);
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    console.log(`[exportSavedCitiesCsv] Contact method: ${contactMethod}`);

    // Authenticate user and determine organization filtering
    const auth = await getAuthFromRequest(req, res);

    // SECURITY: Require authentication for CSV exports
    if (!auth || !auth.user) {
      console.error('[exportSavedCitiesCsv] Unauthorized: No valid auth token');
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = auth.user?.id || auth.userId || auth.id;
    const userOrgId = await getUserOrganizationId(userId);
    const isAdmin = auth.profile?.role === 'Admin' || auth.user?.role === 'Admin';

    let organizationId = req.query.organizationId ? String(req.query.organizationId) : undefined;

    console.log('[exportSavedCitiesCsv] Auth check:', {
      userId,
      userRole: auth.profile?.role,
      isAdmin,
      userOrgId,
      requestedOrgId: organizationId,
      userEmail: auth.user?.email || auth.profile?.email
    });

    // SECURITY: Default behavior - EVERYONE gets filtered to their org
    // UNLESS admin explicitly requests all orgs with exportAll=true

    if (!isAdmin) {
      // Non-admins: ALWAYS filter to their org
      if (!userOrgId) {
        console.error('[exportSavedCitiesCsv] BLOCKED: User has no organization_id', { userId, userEmail: auth.user?.email });
        return res.status(403).json({ error: 'User not assigned to an organization' });
      }
      organizationId = userOrgId;
      console.log('[exportSavedCitiesCsv] Non-Admin: ENFORCING filter to user org:', organizationId);
    }
    else if (isAdmin) {
      // Admins: Check if they want ALL orgs or just their own
      if (req.query.exportAll === 'true') {
        // Admin explicitly requested all organizations
        organizationId = undefined; // No filter = all orgs
        console.log('[exportSavedCitiesCsv] Admin exporting ALL organizations (explicit confirmation)');
      } else {
        // Admin gets their own org by default (safest behavior)
        if (!userOrgId) {
          console.error('[exportSavedCitiesCsv] BLOCKED: Admin has no organization_id', { userId, userEmail: auth.user?.email });
          return res.status(403).json({ error: 'Admin not assigned to an organization' });
        }
        organizationId = userOrgId;
        console.log('[exportSavedCitiesCsv] Admin: Defaulting to user org (use exportAll=true for all):', organizationId);
      }
    }

    // FINAL SAFETY CHECK: Never export without org filter unless explicitly allowed
    if (!organizationId && req.query.exportAll !== 'true') {
      console.error('[exportSavedCitiesCsv] CRITICAL: No organization filter set!', {
        userId,
        userEmail: auth.user?.email,
        isAdmin,
        userOrgId
      });
      return res.status(500).json({ error: 'Server security error: Organization filter missing' });
    }

    // Fetch all current lanes with saved city selections
    let query = supabaseAdmin
      .from('lanes')
      .select('*')
      .eq('lane_status', 'current')
      .not('saved_origin_cities', 'is', null)
      .not('saved_dest_cities', 'is', null);

    // Apply organization filter if needed
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
      console.log('[exportSavedCitiesCsv] Filtering by organization:', organizationId);
    }

    // Apply lane ID filter if specified (for selective export)
    if (laneIds.length > 0) {
      query = query.in('id', laneIds);
      console.log('[exportSavedCitiesCsv] Filtering to specific lanes:', laneIds.length);
    }

    const { data: lanes, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[exportSavedCitiesCsv] Database query failed:', error);
      return res.status(500).json({ error: 'Failed to fetch lanes' });
    }

    if (!lanes || lanes.length === 0) {
      return res.status(422).json({ error: 'No lanes with saved city selections found' });
    }

    console.log(`[exportSavedCitiesCsv] Found ${lanes.length} lanes with saved selections`);
    console.log(`[exportSavedCitiesCsv] Lane org IDs:`, lanes.map(l => ({
      lane: l.origin_city + ' → ' + l.dest_city,
      orgId: l.organization_id
    })).slice(0, 5));

    // Generate CSV rows
    const rows = [];

    for (const lane of lanes) {
      const originCities = lane.saved_origin_cities || [];
      const destCities = lane.saved_dest_cities || [];

      if (originCities.length === 0 || destCities.length === 0) continue;

      // Rate Randomization Logic - Calculated PER ROW now
      // (Removed outer scope calculation)

      // One-to-one pairing
      const numPairs = Math.min(originCities.length, destCities.length);

      for (let i = 0; i < numPairs; i++) {
        const originCity = originCities[i];
        const destCity = destCities[i];

        // Determine which contact methods to use based on parameter
        let contactMethods;
        if (contactMethod === 'email') {
          contactMethods = ['Email'];
        } else if (contactMethod === 'phone') {
          contactMethods = ['Primary Phone'];
        } else {
          contactMethods = ['Email', 'Primary Phone'];
        }

        for (let contactIdx = 0; contactIdx < contactMethods.length; contactIdx++) {
          const currentContactMethod = contactMethods[contactIdx];

          // Calculate Rate for this specific row/posting
          let currentRate = '';
          if (lane.randomize_rate && lane.rate_min && lane.rate_max) {
            const min = Number(lane.rate_min);
            const max = Number(lane.rate_max);
            if (!isNaN(min) && !isNaN(max) && max >= min) {
              currentRate = String(Math.floor(Math.random() * (max - min + 1)) + min);
            }
          } else if (lane.rate) {
            currentRate = String(lane.rate);
          }

          const row = {
            'Pickup Earliest*': lane.pickup_earliest ? format(new Date(lane.pickup_earliest), 'MM/dd/yyyy') : '',
            'Pickup Latest': lane.pickup_latest ? format(new Date(lane.pickup_latest), 'MM/dd/yyyy') : '',
            'Length (ft)*': lane.length_ft || '48',
            'Weight (lbs)*': lane.randomize_weight && lane.weight_min && lane.weight_max
              ? Math.floor(Number(lane.weight_min) + Math.random() * (Number(lane.weight_max) - Number(lane.weight_min)))
              : lane.weight_lbs || '45000',
            'Full/Partial*': lane.full_partial || 'Full',
            'Equipment*': lane.equipment_code || 'V',
            'Use Private Network*': 'No',
            'Private Network Rate': '',
            'Allow Private Network Booking': '',
            'Allow Private Network Bidding': '',
            'Use DAT Loadboard*': 'Yes',
            'DAT Loadboard Rate': currentRate,
            'Allow DAT Loadboard Booking': 'Yes',
            'Use Extended Network': '',
            'Contact Method*': currentContactMethod,
            'Origin City*': originCity.city || '',
            'Origin State*': normalizeStateCode(originCity.state || originCity.state_or_province || ''),
            'Origin Postal Code': '', // Empty per DAT recommendation - reduces manual clicks
            'Destination City*': destCity.city || '',
            'Destination State*': normalizeStateCode(destCity.state || destCity.state_or_province || ''),
            'Destination Postal Code': '', // Empty per DAT recommendation - reduces manual clicks
            'Comment': lane.comment || '',
            'Commodity': lane.commodity || '',
            'Reference ID': '' // FORCE BLANK per user requirement
          };

          rows.push(row);
        }
      }
    }

    if (rows.length === 0) {
      return res.status(422).json({ error: 'No valid rows generated from saved selections' });
    }

    console.log(`[exportSavedCitiesCsv] Generated ${rows.length} CSV rows from ${lanes.length} lanes`);

    // Convert to CSV format
    const csvLines = [];
    csvLines.push(DAT_HEADERS.join(','));

    for (const row of rows) {
      const values = DAT_HEADERS.map(header => {
        const val = row[header] || '';
        // Escape commas and quotes
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      });
      csvLines.push(values.join(','));
    }

    const csv = csvLines.join('\n');
    const filename = `DAT_RapidRoutes_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // FORCE CACHE BUSTING
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.status(200).send(csv);

  } catch (error) {
    console.error('[exportSavedCitiesCsv] Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
