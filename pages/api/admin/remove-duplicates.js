// pages/api/admin/remove-duplicates.js
// API to remove duplicate lanes from the database

import { adminSupabase } from '../../../utils/supabaseAdminClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 DUPLICATE CHECKER: Scanning for duplicate lanes...');
    
    // Get all active lanes
    const { data: lanes, error } = await adminSupabase
      .from('lanes')
      .select('*')
      .in('status', ['pending', 'posted'])
      .order('created_at', { ascending: true }); // Oldest first to keep originals
    
    if (error) throw error;
    
    console.log(`Found ${lanes.length} active lanes`);
    
    // Find duplicates (same origin, destination, equipment)
    const seen = new Map();
    const duplicateIds = [];
    
    lanes.forEach(lane => {
      const key = `${lane.origin_city.toLowerCase().trim()},${lane.origin_state.toLowerCase().trim()}->${lane.dest_city.toLowerCase().trim()},${lane.dest_state.toLowerCase().trim()}-${lane.equipment_code}`;
      
      if (seen.has(key)) {
        // This is a duplicate - mark for deletion
        duplicateIds.push(lane.id);
        console.log(`🔄 DUPLICATE: ${lane.id} - ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state} (${lane.equipment_code})`);
      } else {
        // First occurrence - keep it
        seen.set(key, lane);
      }
    });
    
    if (duplicateIds.length === 0) {
      return res.status(200).json({ 
        message: 'No duplicates found',
        duplicatesRemoved: 0,
        totalLanes: lanes.length
      });
    }
    
    console.log(`❌ Found ${duplicateIds.length} duplicate lanes to remove`);
    
    // Remove duplicates
    const { error: deleteError } = await adminSupabase
      .from('lanes')
      .delete()
      .in('id', duplicateIds);
    
    if (deleteError) {
      throw new Error(`Failed to remove duplicates: ${deleteError.message}`);
    }
    
    console.log(`✅ Successfully removed ${duplicateIds.length} duplicate lanes`);
    
    res.status(200).json({
      message: `Successfully removed ${duplicateIds.length} duplicate lanes`,
      duplicatesRemoved: duplicateIds.length,
      removedIds: duplicateIds,
      totalLanes: lanes.length - duplicateIds.length
    });
    
  } catch (error) {
    console.error('Remove duplicates error:', error);
    res.status(500).json({ error: error.message });
  }
}
