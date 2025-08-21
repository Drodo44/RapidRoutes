// lib/datCsvBuilder.js
// Builds DAT Bulk Upload rows and CSV text from a lane + crawl pairs.
// Enforces exact header order and business rules.

import { generateCrawlPairs } from './datcrawl';

export const DAT_HEADERS = [
  'Pickup Earliest*',
  'Pickup Latest',
  'Length (ft)*',
  'Weight (lbs)*',
  'Full/Partial*',
  'Equipment*',
  'Use Private Network*',
  'Private Network Rate',
  'Allow Private Network Booking',
  'Allow Private Network Bidding',
  'Use DAT Loadboard*',
  'DAT Loadboard Rate',
  'Allow DAT Loadboard Booking',
  'Use Extended Network',
  'Contact Method*',
  'Origin City*',
  'Origin State*',
  'Origin Postal Code',
  'Destination City*',
  'Destination State*',
  'Destination Postal Code',
  'Comment',
  'Commodity',
  'Reference ID',
];

function assertHeadersOrder(headers) {
  if (headers.length !== DAT_HEADERS.length) return false;
  for (let i = 0; i < headers.length; i++) {
    if (headers[i] !== DAT_HEADERS[i]) return false;
  }
  return true;
}

export function ensureLaneWeightValidity(lane) {
  const rnd = !!lane.randomize_weight;
  if (!rnd) {
    if (lane.weight_lbs == null || Number.isNaN(Number(lane.weight_lbs))) {
      throw new Error('Weight is required when randomize_weight is OFF.');
    }
    const w = Number(lane.weight_lbs);
    if (w <= 0) throw new Error('Weight must be a positive number.');
    return;
  }
  // Randomized path: min/max must be valid
  const min = Number(lane.weight_min);
  const max = Number(lane.weight_max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0 || min > max) {
    throw new Error('Invalid randomization range. Ensure positive min/max and min <= max.');
  }
}

function uniformRandomInt(min, max) {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function weightForRow(lane) {
  if (lane.randomize_weight) {
    return String(uniformRandomInt(Number(lane.weight_min), Number(lane.weight_max)));
  }
  return String(Number(lane.weight_lbs));
}

function fullPartialValue(lane) {
  const v = String(lane.full_partial || '').toLowerCase();
  return v === 'partial' ? 'partial' : 'full';
}

function datYesNo(v) {
  return v ? 'yes' : 'no';
}

function contactVariants() {
  // exact lowercase per spec
  return ['email', 'primary phone'];
}

function baseRowFrom(lane, origin, dest, contact) {
  // Build a single CSV row (object keyed by DAT_HEADERS)
  return {
    'Pickup Earliest*': lane.pickup_earliest, // preserve broker-typed format
    'Pickup Latest': lane.pickup_latest,
    'Length (ft)*': String(Number(lane.length_ft)),
    'Weight (lbs)*': weightForRow(lane),
    'Full/Partial*': fullPartialValue(lane),
    'Equipment*': String(lane.equipment_code).toUpperCase(), // DAT code
    'Use Private Network*': 'yes',
    'Private Network Rate': '',
    'Allow Private Network Booking': 'no',
    'Allow Private Network Bidding': 'no',
    'Use DAT Loadboard*': 'yes',
    'DAT Loadboard Rate': '',
    'Allow DAT Loadboard Booking': 'no',
    'Use Extended Network': 'yes',
    'Contact Method*': contact, // "email" | "primary phone"
    'Origin City*': origin.city,
    'Origin State*': origin.state,
    'Origin Postal Code': origin.zip || '',
    'Destination City*': dest.city,
    'Destination State*': dest.state,
    'Destination Postal Code': dest.zip || '',
    'Comment': lane.comment || '',
    'Commodity': lane.commodity || '',
    'Reference ID': String(lane.id || ''),
  };
}

export async function planPairsForLane(lane, { preferFillTo10 = false } = {}) {
  // Expect lane fields per schema; origin/dest in lane are plain text (city/state[/zip]).
  ensureLaneWeightValidity(lane);

  const baseOrigin = { city: lane.origin_city, state: lane.origin_state };
  const baseDest = { city: lane.dest_city, state: lane.dest_state };

  const crawl = await generateCrawlPairs({
    origin: baseOrigin,
    destination: baseDest,
    equipment: lane.equipment_code,
    preferFillTo10,
  });

  return crawl; // contains baseOrigin/baseDest resolved from DB + pairs
}

export function rowsFromBaseAndPairs(lane, baseOrigin, baseDest, pairs) {
  // INTELLIGENT FREIGHT POSTING: 1 base + up to 5 intelligent pairs = 6 total postings
  // Each posting duplicated for 2 contact methods = 12 rows max (down from 22 for quality)
  const postings = [
    { pickup: baseOrigin, delivery: baseDest, isBase: true },
    ...pairs.map((p) => ({ pickup: p.pickup, delivery: p.delivery, isBase: false, score: p.score })),
  ].slice(0, 6); // Reduced from 11 to 6 for strategic freight intelligence

  const rows = [];
  for (const posting of postings) {
    for (const method of contactVariants()) {
      rows.push(baseRowFrom(lane, posting.pickup, posting.delivery, method));
    }
  }
  return rows;
}

export function toCsv(headers, rows) {
  if (!assertHeadersOrder(headers)) {
    throw new Error('DAT headers are out of order or invalid.');
  }
  // Escape & join
  const esc = (v) => {
    if (v == null) return '';
    const s = String(v);
    if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [];
  lines.push(headers.join(','));
  for (const row of rows) {
    const line = headers.map((h) => esc(row[h])).join(',');
    lines.push(line);
  }
  return lines.join('\r\n');
}

export function chunkRows(allRows, max = 499) {
  const chunks = [];
  for (let i = 0; i < allRows.length; i += max) {
    chunks.push(allRows.slice(i, i + max));
  }
  return chunks;
}
