// phase9-csv-diagnostics.js
// PRODUCTION-READY: Variable pair generation system with HERE.com fallback
// ✅ Supports ≥6 unique KMA pairings per lane with no enforced maximum
// ✅ HERE.com fallback enriches cities when Supabase diversity insufficient
// ✅ Deprecated 11-pair logic fully removed - system adapts to geographic constraints
// ✅ Enforces freight quality standards while maximizing coverage
// Ready for integration into full DAT export pipeline

import { config as dotenv } from 'dotenv';
dotenv();

import { adminSupabase } from './utils/supabaseClient.js';
import { EnterpriseCsvGenerator } from './lib/enterpriseCsvGenerator.js';
import { DAT_HEADERS } from './lib/datHeaders.js';

function printSummary(result) {
  const ok = result.success;
  console.log(`\n===== PHASE 9 CSV DIAGNOSTICS =====`);
  console.log(`Status: ${ok ? 'SUCCESS' : 'FAILED'}`);
  if (!ok) {
    console.log(`Error: ${result.error?.message}`);
  }
  const stats = result.statistics || {};
  console.log(`Lanes processed: ${stats.total_lanes ?? 'n/a'}`);
  console.log(`Successful lanes: ${stats.successful_lanes ?? 'n/a'}`);
  console.log(`Failed lanes: ${stats.failed_lanes ?? 'n/a'}`);
  console.log(`Total rows: ${stats.total_rows ?? (result.csv?.rows_count || 0)}`);
  if (Array.isArray(result.generation_errors) && result.generation_errors.length) {
    console.log(`\nSample errors:`);
    for (const e of result.generation_errors.slice(0, 5)) {
      console.log(`  • Lane ${e.lane_id}: ${e.error}`);
    }
  }
}

function validateCsvHeaders(csv) {
  const firstLine = String(csv).split(/[\r\n]+/).find(l => l.trim());
  const headers = firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const missing = DAT_HEADERS.filter(h => !headers.includes(h));
  return { missing, count: headers.length };
}

async function fetchTargetLanes() {
  const { data, error } = await adminSupabase
    .from('lanes')
    .select('*')
  .eq('lane_status', 'pending')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
}

async function main() {
  try {
    const lanes = await fetchTargetLanes();
    if (!lanes.length) {
      console.log('No pending lanes found. Exiting.');
      return;
    }

    // Import normalization utility
    const { normalizeDatDate } = await import('./lib/datCsvBuilder.js');

    // Normalize pickup_earliest and pickup_latest for each lane and log
    for (const lane of lanes) {
      lane.pickup_earliest = normalizeDatDate(lane.pickup_earliest || lane.earliest || lane.date);
      lane.pickup_latest = normalizeDatDate(lane.pickup_latest || lane.latest || lane.date);
      console.log(`[PHASE9-FINAL-DATE] Lane ${lane.id || ''} pickup_earliest:`, lane.pickup_earliest, 'pickup_latest:', lane.pickup_latest);
    }

    const generator = new EnterpriseCsvGenerator({
      generation: { 
        minPairsPerLane: 6,  // Production minimum: 6 pairs per lane, no maximum
        enableTransactions: true,
        enableCaching: true
        // maxConcurrentLanes: 10 is preserved from default config via deep merge
      },
      verification: { postGenerationVerification: true },
    });

    const result = await generator.generate(lanes);

    printSummary(result);

    if (result.success) {
      // Validate CSV headers
      const headerCheck = validateCsvHeaders(result.csv.string);
      if (headerCheck.count !== 24 || headerCheck.missing.length) {
        console.log('\n❌ Header check failed:', headerCheck);
      } else {
        console.log('\n✅ Header check passed (24 headers, DAT-compliant)');
      }

      // Chunking check
      const chunks = result.chunks || [];
      const overs = chunks.filter(c => c.rows.length > 499).length;
      console.log(`Chunks: ${chunks.length}; Oversized: ${overs}`);

      // Per-lane breakdown
      if (Array.isArray(result.lane_results)) {
        console.log('\nPer-lane status:');
        for (const r of result.lane_results.slice(0, 20)) {
          if (r.success) {
            console.log(`  ✅ Lane ${r.lane_id}: ${r.rows.length} rows`);
          } else {
            console.log(`  ❌ Lane ${r.lane_id}: ${r.error}`);
          }
        }
        if (result.lane_results.length > 20) {
          console.log(`  ...and ${result.lane_results.length - 20} more lanes`);
        }
      }
    }
  } catch (err) {
    console.error('Phase 9 diagnostics failed:', err);
    process.exitCode = 1;
  }
}

main();
