// TQL API Integration Service
// This will sync loads from TQL Load Manager → RapidRoutes automatically

import { adminSupabase as supabase } from '../utils/supabaseClient.js';

/**
 * Configuration for TQL API integration
 * You'll fill this in after completing TQL_API_DISCOVERY_GUIDE.md
 */
const TQL_CONFIG = {
  // Replace these after API discovery
  baseUrl: process.env.TQL_API_BASE_URL || 'https://api.tql.com',
  endpoints: {
    activeLoads: '/loads/active',
    loadDetails: '/loads/:loadId',
    createPosting: '/postings'
  },
  
  // Authentication - fill in after discovery
  auth: {
    type: process.env.TQL_AUTH_TYPE || 'bearer', // 'bearer', 'cookie', or 'apikey'
    token: process.env.TQL_AUTH_TOKEN,
    refreshUrl: process.env.TQL_TOKEN_REFRESH_URL
  },
  
  // Sync settings
  syncInterval: 5 * 60 * 1000, // 5 minutes (300000ms)
  enabled: process.env.TQL_SYNC_ENABLED === 'true'
};

/**
 * Fetch active loads from TQL API
 */
export async function fetchTQLLoads(userId) {
  try {
    // Get user's TQL credentials from database
    const { data: credentials } = await supabase
      .from('tql_integrations')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (!credentials || !credentials.enabled) {
      return { success: false, error: 'TQL integration not configured' };
    }
    
    // Call TQL API
    const response = await fetch(`${TQL_CONFIG.baseUrl}${TQL_CONFIG.endpoints.activeLoads}`, {
      method: 'GET',
      headers: getAuthHeaders(credentials)
    });
    
    if (!response.ok) {
      throw new Error(`TQL API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return { success: true, loads: data.loads || data };
    
  } catch (error) {
    console.error('[TQL Sync] Fetch error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Transform TQL load data to RapidRoutes lane format
 */
function transformTQLToLane(tqlLoad, organizationId, userId) {
  return {
    // Core lane data
    origin_city: tqlLoad.pickCity || tqlLoad.originCity,
    origin_state: tqlLoad.pickState || tqlLoad.originState,
    origin_zip: tqlLoad.pickZip || tqlLoad.originZip,
    dest_city: tqlLoad.dropCity || tqlLoad.destinationCity,
    dest_state: tqlLoad.dropState || tqlLoad.destinationState,
    dest_zip: tqlLoad.dropZip || tqlLoad.destinationZip,
    
    // Equipment and specs
    equipment_code: tqlLoad.equipment || tqlLoad.equipmentType,
    length_ft: tqlLoad.length || 53,
    weight_lbs: tqlLoad.weight,
    full_partial: (tqlLoad.loadType || tqlLoad.modeType) === 'FTL' ? 'Full' : 'Partial',
    
    // Dates
    pickup_earliest: tqlLoad.pickDate || tqlLoad.pickupDate,
    pickup_latest: tqlLoad.pickDateLatest || tqlLoad.pickDate,
    
    // Additional info
    commodity: tqlLoad.commodity,
    comment: tqlLoad.instructions || tqlLoad.notes || tqlLoad.comments,
    
    // TQL-specific tracking
    po_number: tqlLoad.poNumber || tqlLoad.purchaseOrder,
    tql_load_id: tqlLoad.loadId || tqlLoad.id,
    tql_synced_at: new Date().toISOString(),
    
    // RapidRoutes metadata
    organization_id: organizationId,
    user_id: userId,
    lane_status: 'current',
    created_at: new Date().toISOString()
  };
}

/**
 * Sync TQL loads to RapidRoutes lanes
 */
export async function syncTQLLoadsToLanes(userId, organizationId) {
  console.log('[TQL Sync] Starting sync for user:', userId);
  
  try {
    // 1. Fetch loads from TQL
    const { success, loads, error } = await fetchTQLLoads(userId);
    
    if (!success) {
      return { 
        success: false, 
        error,
        synced: 0,
        skipped: 0,
        failed: 0
      };
    }
    
    if (!loads || loads.length === 0) {
      return { 
        success: true, 
        message: 'No loads to sync',
        synced: 0,
        skipped: 0,
        failed: 0
      };
    }
    
    // 2. Check which loads already exist in RapidRoutes
    const tqlLoadIds = loads.map(l => l.loadId || l.id).filter(Boolean);
    
    const { data: existingLanes } = await supabase
      .from('lanes')
      .select('tql_load_id')
      .in('tql_load_id', tqlLoadIds)
      .eq('organization_id', organizationId);
    
    const existingIds = new Set(existingLanes?.map(l => l.tql_load_id) || []);
    
    // 3. Filter to only new loads
    const newLoads = loads.filter(load => {
      const id = load.loadId || load.id;
      return id && !existingIds.has(id);
    });
    
    if (newLoads.length === 0) {
      return {
        success: true,
        message: 'All loads already synced',
        synced: 0,
        skipped: loads.length,
        failed: 0
      };
    }
    
    // 4. Transform and insert new lanes
    const newLanes = newLoads.map(load => 
      transformTQLToLane(load, organizationId, userId)
    );
    
    const { data: insertedLanes, error: insertError } = await supabase
      .from('lanes')
      .insert(newLanes)
      .select();
    
    if (insertError) {
      throw insertError;
    }
    
    // 5. Log sync event
    await supabase
      .from('tql_sync_logs')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        synced_count: insertedLanes?.length || 0,
        skipped_count: existingIds.size,
        status: 'success',
        synced_at: new Date().toISOString()
      });
    
    console.log('[TQL Sync] Success:', {
      synced: insertedLanes?.length,
      skipped: existingIds.size
    });
    
    return {
      success: true,
      synced: insertedLanes?.length || 0,
      skipped: existingIds.size,
      failed: 0,
      lanes: insertedLanes
    };
    
  } catch (error) {
    console.error('[TQL Sync] Error:', error);
    
    // Log failed sync
    await supabase
      .from('tql_sync_logs')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        status: 'error',
        error_message: error.message,
        synced_at: new Date().toISOString()
      });
    
    return {
      success: false,
      error: error.message,
      synced: 0,
      skipped: 0,
      failed: 1
    };
  }
}

/**
 * Post RapidRoutes lane to TQL posting system
 */
export async function postLaneToTQL(laneId, userId) {
  try {
    // 1. Get lane data
    const { data: lane, error: laneError } = await supabase
      .from('lanes')
      .select('*')
      .eq('id', laneId)
      .single();
    
    if (laneError) throw laneError;
    
    // 2. Get user's TQL credentials
    const { data: credentials } = await supabase
      .from('tql_integrations')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (!credentials?.enabled) {
      throw new Error('TQL integration not configured');
    }
    
    // 3. Transform lane to TQL posting format
    const tqlPosting = {
      // You'll adjust this structure based on actual TQL API
      pickCity: lane.origin_city,
      pickState: lane.origin_state,
      pickZip: lane.origin_zip,
      dropCity: lane.dest_city,
      dropState: lane.dest_state,
      dropZip: lane.dest_zip,
      equipment: lane.equipment_code,
      length: lane.length_ft,
      weight: lane.weight_lbs,
      pickDate: lane.pickup_earliest,
      commodity: lane.commodity,
      instructions: lane.comment,
      poNumber: lane.po_number,
      postToDAT: true,
      postToTruckstop: true,
      postToCarrierDashboard: true
    };
    
    // 4. Call TQL posting API
    const response = await fetch(`${TQL_CONFIG.baseUrl}${TQL_CONFIG.endpoints.createPosting}`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(credentials),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tqlPosting)
    });
    
    if (!response.ok) {
      throw new Error(`TQL API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    // 5. Update lane with TQL posting ID
    await supabase
      .from('lanes')
      .update({
        tql_posting_id: result.postingId || result.id,
        tql_posted_at: new Date().toISOString()
      })
      .eq('id', laneId);
    
    return {
      success: true,
      postingId: result.postingId || result.id,
      postedTo: ['DAT', 'Truckstop', 'Carrier Dashboard']
    };
    
  } catch (error) {
    console.error('[TQL Post] Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Helper: Build auth headers based on TQL auth type
 */
function getAuthHeaders(credentials) {
  const headers = {};
  
  switch (TQL_CONFIG.auth.type) {
    case 'bearer':
      headers['Authorization'] = `Bearer ${credentials.access_token}`;
      break;
    case 'apikey':
      headers['X-API-Key'] = credentials.api_key;
      break;
    case 'cookie':
      headers['Cookie'] = credentials.session_cookie;
      break;
  }
  
  return headers;
}

/**
 * Background job: Auto-sync on interval
 * Call this from a cron job or Vercel Edge Function
 */
export async function autoSyncAllUsers() {
  console.log('[TQL Auto-Sync] Starting...');
  
  // Get all users with TQL integration enabled
  const { data: integrations } = await supabase
    .from('tql_integrations')
    .select('user_id, organization_id')
    .eq('enabled', true)
    .eq('auto_sync', true);
  
  if (!integrations || integrations.length === 0) {
    console.log('[TQL Auto-Sync] No users configured');
    return;
  }
  
  // Sync each user
  const results = await Promise.allSettled(
    integrations.map(({ user_id, organization_id }) =>
      syncTQLLoadsToLanes(user_id, organization_id)
    )
  );
  
  const summary = {
    total: results.length,
    successful: results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length
  };
  
  console.log('[TQL Auto-Sync] Complete:', summary);
  return summary;
}
