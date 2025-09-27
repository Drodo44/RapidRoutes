#!/usr/bin/env node
/**
 * Production Verification Script for Intelligence Pairing API
 *
 * Usage: node scripts/verify-production-pairing.js [--host=https://rapid-routes.vercel.app] [--debug]
 *
 * Lanes tested:
 *  - Fitzgerald, GA -> Winter Haven, FL
 *  - Augusta, GA -> Stephenson, VA
 *  - Riegelwood, NC -> Altamont, NY
 *
 * Classification Logic:
 *  - error: response contains error property OR network failure
 *  - success: pairs length > 0
 *  - skipped: pairs length == 0 and no explicit error
 */

const DEFAULT_HOST = 'https://rapid-routes.vercel.app';

const lanes = [
  { id: 'L1', origin_city: 'Fitzgerald', origin_state: 'GA', dest_city: 'Winter Haven', dest_state: 'FL' },
  { id: 'L2', origin_city: 'Augusta', origin_state: 'GA', dest_city: 'Stephenson', dest_state: 'VA' },
  { id: 'L3', origin_city: 'Riegelwood', origin_state: 'NC', dest_city: 'Altamont', dest_state: 'NY' }
];

function parseArgs(argv) {
  const flags = { debug: false, host: DEFAULT_HOST };
  argv.slice(2).forEach(arg => {
    if (arg === '--debug') flags.debug = true;
    else if (arg.startsWith('--host=')) flags.host = arg.split('=')[1];
  });
  return flags;
}

async function postLane(host, lane, debug) {
  const url = host.replace(/\/$/, '') + '/api/intelligence-pairing';
  const body = {
    origin_city: lane.origin_city,
    origin_state: lane.origin_state,
    dest_city: lane.dest_city,
    dest_state: lane.dest_state
  };
  const headers = { 'Content-Type': 'application/json' };
  if (debug) headers['PAIRING_DEBUG'] = '1';

  const started = Date.now();
  try {
    if (debug) console.log('\n🐞 REQUEST', { url, body, headers });
    const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    const text = await resp.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; } catch { json = { parseError: true, raw: text }; }
    if (debug) console.log('🐞 RESPONSE', { status: resp.status, json });

    const pairs = Array.isArray(json.pairs) ? json.pairs : [];
    const classification = json.error ? 'error' : (pairs.length > 0 ? 'success' : 'skipped');
    return {
      laneId: lane.id,
      classification,
      status: resp.status,
      totalCityPairs: json.totalCityPairs || pairs.length || 0,
      uniqueOriginKmas: json.uniqueOriginKmas || 0,
      uniqueDestKmas: json.uniqueDestKmas || 0,
      error: json.error || null,
      pairsCount: pairs.length,
      ms: Date.now() - started
    };
  } catch (err) {
    return {
      laneId: lane.id,
      classification: 'error',
      status: 0,
      totalCityPairs: 0,
      uniqueOriginKmas: 0,
      uniqueDestKmas: 0,
      error: 'NETWORK_ERROR: ' + err.message,
      pairsCount: 0,
      ms: Date.now() - started
    };
  }
}

async function main() {
  const { debug, host } = parseArgs(process.argv);
  console.log(`🚀 Production Pairing Verification (host=${host}, debug=${debug})`);
  const start = Date.now();

  let success = 0, skipped = 0, errors = 0;
  const results = [];

  for (const lane of lanes) {
    const r = await postLane(host, lane, debug);
    // Additional gating logic for CI smoke test:
    if (!r.error && r.classification === 'success') {
      const unionEstimate = new Set([...(new Array(r.uniqueOriginKmas).keys()).map(i=>`O${i}`), ...(new Array(r.uniqueDestKmas).keys()).map(i=>`D${i}`)]).size; // placeholder union since API returns separate counts only
      // Failing conditions:
      // - totalCityPairs == 0
      // - uniqueOriginKmas + uniqueDestKmas < 5 (approx if union not provided)
      // (API currently enforces union >=5; we approximate here using sum heuristic)
      if (r.totalCityPairs === 0 || (r.uniqueOriginKmas + r.uniqueDestKmas) < 5) {
        r.classification = 'error';
        r.error = r.error || 'SMOKE_VALIDATION_FAILED';
      }
    }
    results.push(r);
    if (r.classification === 'success') success++; else if (r.classification === 'error') errors++; else skipped++;
    console.log(`[PROD] Lane ${r.laneId} outcome: ${r.classification} (pairs=${r.pairsCount}, totalCityPairs=${r.totalCityPairs}, KMAo=${r.uniqueOriginKmas}, KMAd=${r.uniqueDestKmas}${r.error ? ', error=' + r.error : ''}, ${r.ms}ms)`);
  }

  const totalTime = Date.now() - start;
  const avg = Math.round(totalTime / results.length);
  console.log(`\n✨ Production verification complete: ${success} success, ${skipped} skipped, ${errors} errors in ${totalTime}ms (avg: ${avg}ms/lane)`);

  // If debug, output JSON summary for machine parsing
  if (debug) {
    console.log('\n🐞 SUMMARY OBJECT');
    console.log(JSON.stringify({ success, skipped, errors, totalTime, avg, results }, null, 2));
  }

  // Exit with error code if any errors (so CI can catch)
  process.exit(errors > 0 ? 1 : 0);
}

if (typeof fetch !== 'function') {
  console.error('Global fetch not available (requires Node 18+).');
  process.exit(1);
}

main();
