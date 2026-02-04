// scripts/generateDATCsv.js
// Generate a DAT-compliant CSV using geographic crawl pairs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateGeographicCrawlPairs } from '../lib/geographicCrawl.js';
import { DAT_HEADERS } from '../lib/datHeaders.js';
import { rowsFromBaseAndPairs, toCsv, MIN_PAIRS_REQUIRED } from '../lib/datCsvBuilder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ORIGIN = { city: 'Chicago', state: 'IL' };
const DESTINATION = { city: 'Nashville', state: 'TN' };

async function run() {
  console.log('🚚 Running geographic crawl for lane Chicago, IL → Nashville, TN');

  // Use the smart geographic crawl (75 → 100 → 125 miles)
  const crawl = await generateGeographicCrawlPairs({
    origin: ORIGIN,
    destination: DESTINATION,
  });

  const pairs = Array.isArray(crawl?.pairs) ? crawl.pairs : [];
  console.log(`🔎 Pairs found: ${pairs.length}`);

  if (pairs.length < MIN_PAIRS_REQUIRED) {
    console.warn(`⚠️ Only ${pairs.length} pairs found. Proceeding anyway (minimum target is ${MIN_PAIRS_REQUIRED}).`);
  }

  // Minimal lane for CSV row generation (required fields only)
  const lane = {
    id: 'script-lane-chi-tn',
    origin_city: ORIGIN.city,
    origin_state: ORIGIN.state,
    origin_zip: '',
    dest_city: DESTINATION.city,
    dest_state: DESTINATION.state,
    dest_zip: '',
    equipment_code: 'V',
    length_ft: 53,
    randomize_weight: false,
    weight_lbs: 25000,
    full_partial: 'full',
    pickup_earliest: new Date().toISOString().slice(0, 10), // today (ISO); builder normalizes
    pickup_latest: new Date().toISOString().slice(0, 10),
    commodity: 'General Freight',
    comment: 'Generated via scripts/generateDATCsv.js'
  };

  // Build rows using core builder that enforces 2 contacts per pair
  const baseOrigin = { city: ORIGIN.city, state: ORIGIN.state };
  const baseDest = { city: DESTINATION.city, state: DESTINATION.state };
  const csvRows = rowsFromBaseAndPairs(lane, baseOrigin, baseDest, pairs);

  if (!csvRows || csvRows.length === 0) {
    throw new Error('No CSV rows generated');
  }

  // Convert to CSV string with exact DAT headers
  const csv = toCsv(DAT_HEADERS, csvRows);

  // Write to public/dat_output.csv
  const outputPath = path.join(__dirname, '..', 'public', 'dat_output.csv');
  fs.writeFileSync(outputPath, csv, 'utf8');
  console.log(`✅ CSV written to ${outputPath} (${csvRows.length} rows)`);
}

run().catch(err => {
  console.error('❌ CSV generation failed:', err);
  process.exit(1);
});
