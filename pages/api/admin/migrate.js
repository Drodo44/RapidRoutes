// pages/api/admin/migrate.js
// Admin API route for running database migrations

import { supabase } from '../../../utils/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting migration to fix duplicate reference IDs...');

    // Step 1: Update lanes with missing reference IDs
    const { data: missingIds, error: error1 } = await supabase
      .from('lanes')
      .select('id')
      .or('reference_id.is.null,reference_id.eq.');

    if (error1) {
      console.error('Error finding lanes with missing reference IDs:', error1);
      return res.status(500).json({ error: 'Failed to query missing reference IDs' });
    }

    console.log(`Found ${missingIds?.length || 0} lanes with missing reference IDs`);

    // Update missing reference IDs one by one
    if (missingIds && missingIds.length > 0) {
      for (const lane of missingIds) {
        const refId = `RR${String(lane.id).padStart(5, '0')}`;
        const { error } = await supabase
          .from('lanes')
          .update({ reference_id: refId })
          .eq('id', lane.id);

        if (error) {
          console.error(`Error updating reference ID for lane ${lane.id}:`, error);
        }
      }
    }

    // Step 2: Find duplicate reference IDs
    const { data: allLanes, error: error2 } = await supabase
      .from('lanes')
      .select('id, reference_id')
      .not('reference_id', 'is', null);

    if (error2) {
      console.error('Error fetching all lanes:', error2);
      return res.status(500).json({ error: 'Failed to query all lanes' });
    }

    // Group by reference_id to find duplicates
    const refIdGroups = {};
    allLanes?.forEach(lane => {
      if (!refIdGroups[lane.reference_id]) {
        refIdGroups[lane.reference_id] = [];
      }
      refIdGroups[lane.reference_id].push(lane);
    });

    const duplicates = Object.values(refIdGroups).filter(group => group.length > 1);
    console.log(`Found ${duplicates.length} sets of duplicate reference IDs`);

    // Fix duplicates by regenerating reference IDs based on lane ID
    let fixedCount = 0;
    for (const group of duplicates) {
      for (const lane of group) {
        const newRefId = `RR${String(lane.id).padStart(5, '0')}`;
        if (newRefId !== lane.reference_id) {
          const { error } = await supabase
            .from('lanes')
            .update({ reference_id: newRefId })
            .eq('id', lane.id);

          if (error) {
            console.error(`Error fixing reference ID for lane ${lane.id}:`, error);
          } else {
            fixedCount++;
          }
        }
      }
    }

    console.log(`Migration completed. Fixed ${fixedCount} duplicate reference IDs.`);

    res.status(200).json({
      success: true,
      message: 'Migration completed successfully',
      missingIds: missingIds?.length || 0,
      duplicatesFixed: fixedCount
    });

  } catch (error) {
    console.error('Migration failed:', error);
    res.status(500).json({ error: 'Migration failed', details: error.message });
  }
}
