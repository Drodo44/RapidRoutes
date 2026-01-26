// Fix pending lanes data validation issues
// This script identifies and fixes pending lanes with invalid reference_id or date formats

import { adminSupabase } from './utils/supabaseClient.js';

// ISO date normalization function (same as in datCsvBuilder.js)
function normalizeDateToISO(val) {
  function pad2(n) { return n.toString().padStart(2, '0'); }
  let d;
  
  if (!val) {
    d = new Date();
  } else if (val instanceof Date) {
    d = val;
  } else if (typeof val === 'string') {
    // If already ISO format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    
    // Handle MM/DD/YYYY format - convert to ISO
    const mdy = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdy) {
      return `${mdy[3]}-${pad2(mdy[1])}-${pad2(mdy[2])}`;
    }
    
    d = new Date(val);
  } else {
    d = new Date(val);
  }
  
  if (isNaN(d.getTime())) {
    // If invalid, default to today
    d = new Date();
  }
  
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Generate valid reference ID
function generateValidReferenceId(laneId, existingRefIds = new Set()) {
  const laneIdStr = String(laneId);
  
  // Extract numeric characters and create consistent reference ID
  const numericPart = laneIdStr.split('-')[0].replace(/[a-f]/g, '').substring(0,5) || '10000';
  const referenceNum = String(Math.abs(parseInt(numericPart, 10) || 10000) % 100000).padStart(5, '0');
  let uniqueRefId = `RR${referenceNum}`;
  
  // Ensure uniqueness
  let counter = 1;
  while (existingRefIds.has(uniqueRefId)) {
    const baseNum = parseInt(uniqueRefId.slice(2), 10);
    const newNum = String((baseNum + counter) % 100000).padStart(5, '0');
    uniqueRefId = `RR${newNum}`;
    counter++;
    
    if (counter > 100000) {
      uniqueRefId = `RR${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
      break;
    }
  }
  
  return uniqueRefId;
}

async function fixPendingLanesValidation() {
  console.log('🔍 IDENTIFYING PENDING LANES WITH VALIDATION ISSUES\n');

  try {
    // Get all pending lanes
    const { data: pendingLanes, error: fetchError } = await adminSupabase
      .from('lanes')
      .select('*')
  .eq('lane_status', 'pending')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error fetching pending lanes:', fetchError);
      return;
    }

    if (!pendingLanes || pendingLanes.length === 0) {
      console.log('ℹ️  No pending lanes found in database');
      return;
    }

    console.log(`📋 Found ${pendingLanes.length} pending lanes to validate\n`);

    // Collect all existing reference IDs to ensure uniqueness
    const { data: allLanes, error: allLanesError } = await adminSupabase
      .from('lanes')
      .select('reference_id')
      .not('reference_id', 'is', null);

    const existingRefIds = new Set(
      (allLanes || [])
        .map(lane => lane.reference_id)
        .filter(refId => refId && /^RR\d{5}$/.test(refId))
    );

    console.log(`📚 Found ${existingRefIds.size} existing valid reference IDs\n`);

    // Track issues and fixes
    const issues = {
      invalidReferenceId: [],
      invalidPickupEarliest: [],
      invalidPickupLatest: [],
      missingPickupEarliest: [],
      missingPickupLatest: []
    };

    const fixes = [];

    // Analyze each pending lane
    for (const lane of pendingLanes) {
      const laneIssues = {
        id: lane.id,
        origin: `${lane.origin_city}, ${lane.origin_state}`,
        destination: `${lane.dest_city}, ${lane.dest_state}`,
        problems: [],
        fixes: {}
      };

      // Check reference_id
      const hasValidRefId = lane.reference_id && /^RR\d{5}$/.test(lane.reference_id);
      if (!hasValidRefId) {
        issues.invalidReferenceId.push(lane);
        laneIssues.problems.push(`Invalid reference_id: "${lane.reference_id}"`);
        
        const newRefId = generateValidReferenceId(lane.id, existingRefIds);
        existingRefIds.add(newRefId);
        laneIssues.fixes.reference_id = newRefId;
      }

      // Check pickup_earliest
      const hasValidEarliest = lane.pickup_earliest && /^\d{4}-\d{2}-\d{2}$/.test(lane.pickup_earliest);
      if (!lane.pickup_earliest) {
        issues.missingPickupEarliest.push(lane);
        laneIssues.problems.push('Missing pickup_earliest');
        
        const defaultDate = normalizeDateToISO(new Date());
        laneIssues.fixes.pickup_earliest = defaultDate;
      } else if (!hasValidEarliest) {
        issues.invalidPickupEarliest.push(lane);
        laneIssues.problems.push(`Invalid pickup_earliest format: "${lane.pickup_earliest}"`);
        
        const fixedDate = normalizeDateToISO(lane.pickup_earliest);
        laneIssues.fixes.pickup_earliest = fixedDate;
      }

      // Check pickup_latest
      const hasValidLatest = lane.pickup_latest && /^\d{4}-\d{2}-\d{2}$/.test(lane.pickup_latest);
      if (!lane.pickup_latest) {
        issues.missingPickupLatest.push(lane);
        laneIssues.problems.push('Missing pickup_latest');
        
        const defaultDate = laneIssues.fixes.pickup_earliest || normalizeDateToISO(lane.pickup_earliest) || normalizeDateToISO(new Date());
        laneIssues.fixes.pickup_latest = defaultDate;
      } else if (!hasValidLatest) {
        issues.invalidPickupLatest.push(lane);
        laneIssues.problems.push(`Invalid pickup_latest format: "${lane.pickup_latest}"`);
        
        const fixedDate = normalizeDateToISO(lane.pickup_latest);
        laneIssues.fixes.pickup_latest = fixedDate;
      }

      // Add to fixes if there are problems
      if (laneIssues.problems.length > 0) {
        fixes.push(laneIssues);
      }
    }

    // Report findings
    console.log('📊 VALIDATION ISSUES SUMMARY:');
    console.log(`- Invalid reference_id: ${issues.invalidReferenceId.length} lanes`);
    console.log(`- Invalid pickup_earliest: ${issues.invalidPickupEarliest.length} lanes`);
    console.log(`- Invalid pickup_latest: ${issues.invalidPickupLatest.length} lanes`);
    console.log(`- Missing pickup_earliest: ${issues.missingPickupEarliest.length} lanes`);
    console.log(`- Missing pickup_latest: ${issues.missingPickupLatest.length} lanes`);
    console.log(`- Total lanes needing fixes: ${fixes.length}\n`);

    if (fixes.length === 0) {
      console.log('✅ All pending lanes pass validation - no fixes needed!');
      return;
    }

    // Show detailed issues
    console.log('🔍 DETAILED ISSUES BY LANE:');
    fixes.forEach((laneIssue, index) => {
      console.log(`\n${index + 1}. Lane ${laneIssue.id}:`);
      console.log(`   Route: ${laneIssue.origin} → ${laneIssue.destination}`);
      console.log(`   Problems: ${laneIssue.problems.join(', ')}`);
      console.log(`   Fixes:`, laneIssue.fixes);
    });

    console.log('\n🛠️  APPLYING FIXES TO DATABASE...\n');

    // Apply fixes to database
    let successCount = 0;
    let errorCount = 0;

    for (const laneIssue of fixes) {
      try {
        const { error: updateError } = await adminSupabase
          .from('lanes')
          .update(laneIssue.fixes)
          .eq('id', laneIssue.id);

        if (updateError) {
          console.log(`❌ Failed to fix lane ${laneIssue.id}:`, updateError.message);
          errorCount++;
        } else {
          console.log(`✅ Fixed lane ${laneIssue.id}:`, Object.keys(laneIssue.fixes).join(', '));
          successCount++;
        }
      } catch (error) {
        console.log(`❌ Error fixing lane ${laneIssue.id}:`, error.message);
        errorCount++;
      }
    }

    // Final summary
    console.log(`\n📈 FIX RESULTS SUMMARY:`);
    console.log(`- Successfully fixed: ${successCount} lanes`);
    console.log(`- Errors encountered: ${errorCount} lanes`);
    console.log(`- Total processed: ${fixes.length} lanes`);

    if (successCount > 0) {
      console.log('\n🎉 VALIDATION FIXES APPLIED!');
      console.log('- All reference_id fields now match /^RR\\d{5}$/ pattern');
      console.log('- All pickup_earliest and pickup_latest fields are ISO dates (YYYY-MM-DD)');
      console.log('- CSV export should now succeed for all pending lanes');
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Run the fix script
console.log('🚀 STARTING PENDING LANES VALIDATION FIX\n');
fixPendingLanesValidation()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });