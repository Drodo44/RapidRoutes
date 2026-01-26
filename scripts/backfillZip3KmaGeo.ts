import 'dotenv/config'; // Auto-loads .env variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, HERE_API_KEY, etc.)
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

/*
  Backfill Script: zip3_kma_geo
  --------------------------------------------------
  1. Loads DAT KMA mapping (CSV or JSON) containing zip3 -> kma_code.
  2. For each zip3: ensure we have centroid lat/lng.
     - Primary: HERE Geocoding API (zip3 + ' USA').
     - Fallback: US Census ZCTA centroid (via API) or static fallback.
  3. Upserts into Supabase table `zip3_kma_geo` with columns:
       zip3 (PK), kma_code, latitude, longitude
  4. Batches of 500 for upsert; logs progress.
  5. Re-runnable (idempotent) – will refresh lat/lng and kma_code.

  Environment Variables Required:
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, HERE_API_KEY

  Usage:
    npx ts-node scripts/backfillZip3KmaGeo.ts --file data/dat_kma_mapping.csv
*/

interface Zip3Record { zip3: string; kma_code: string; }
interface EnrichedZip3 extends Zip3Record { latitude: number; longitude: number; }

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const HERE_API_KEY = process.env.HERE_API_KEY || process.env.HERE_API_KEY_PRIMARY || '';

if (!SUPABASE_URL) {
  console.error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)');
  process.exit(1);
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!HERE_API_KEY) {
  console.error('Missing HERE_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

function parseArgs() {
  const args = process.argv.slice(2);
  const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].replace(/^--/, '');
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
      out[key] = value;
    }
  }
  return out;
}

async function loadMapping(filePath: string): Promise<Zip3Record[]> {
  if (!fs.existsSync(filePath)) throw new Error(`Mapping file not found: ${filePath}`);
  const raw = fs.readFileSync(filePath, 'utf-8');
  if (filePath.endsWith('.json')) {
    const json = JSON.parse(raw);
    return Object.entries(json).flatMap(([kma_code, prefixes]: any) => {
      if (Array.isArray(prefixes)) return prefixes.filter(p=>/^\d{3}$/.test(p)).map(p => ({ zip3: p, kma_code }));
      return [];
    });
  }
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  // Find header line containing 'Market Area ID'
  const headerIndex = lines.findIndex(l => /Market Area ID/i.test(l));
  if (headerIndex === -1) throw new Error('Cannot locate Market Area header');
  const dataLines = lines.slice(headerIndex + 1); // subsequent lines hold data
  const out: Zip3Record[] = [];
  for (const line of dataLines) {
    // Stop if we hit a separator or non-data
    if (/^#+$/.test(line)) continue;
    const cols = line.split(',');
    // Format: Count,Ref City,Ref State,Market Area ID,Market Area Name,Postal Prefix List,...
    if (cols.length < 6) continue;
    const marketAreaId = cols[3]?.trim();
    const postalStartIdx = 5;
    if (!marketAreaId) continue;
    for (let i = postalStartIdx; i < cols.length; i++) {
      const maybe = cols[i]?.trim();
      if (/^\d{3}$/.test(maybe)) {
        out.push({ zip3: maybe, kma_code: marketAreaId });
      }
    }
  }
  // Deduplicate (last write wins) keeping first occurrence
  const map = new Map<string, string>();
  for (const r of out) if (!map.has(r.zip3)) map.set(r.zip3, r.kma_code);
  return [...map.entries()].map(([zip3, kma_code]) => ({ zip3, kma_code }));
}

async function geocodeZip3(zip3: string): Promise<{ lat: number; lng: number } | null> {
  // Try HERE API – treat zip3 as partial ZIP; We'll append * for wildcard search
  try {
    const q = encodeURIComponent(`${zip3}00, USA`); // heuristic center (e.g., 45200 approximates 452xx area)
    const url = `https://geocode.search.hereapi.com/v1/geocode?q=${q}&apiKey=${HERE_API_KEY}`;
    const resp = await axios.get(url, { timeout: 10000 });
    if (resp.data?.items?.length) {
      const item = resp.data.items[0];
      return { lat: item.position.lat, lng: item.position.lng };
    }
  } catch (err) {
    console.warn(`HERE geocode failed for ${zip3}: ${(err as any).message}`);
  }
  // Fallback: US Census ZCTA centroid (fetch one example ZIP: zip3 + '01')
  try {
    const probeZip = `${zip3}01`;
    const url = `https://geo.fcc.gov/api/census/block/find?format=json&zip=${probeZip}`;
    const resp = await axios.get(url, { timeout: 10000 });
    if (resp.data?.Block?.FIPS && resp.data?.County && resp.data?.County.FIPS) {
      const lat = Number(resp.data?.Latitude);
      const lng = Number(resp.data?.Longitude);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
    }
  } catch (err) {
    console.warn(`Census fallback failed for ${zip3}: ${(err as any).message}`);
  }
  return null;
}

async function ensureTable() {
  // Attempt to create table if not exists (idempotent) via SQL RPC or direct query not available; user should pre-create.
  // Provide SQL for transparency.
  console.log(`If needed, create table with:\nCREATE TABLE IF NOT EXISTS public.zip3_kma_geo (\n  zip3 TEXT PRIMARY KEY,\n  kma_code TEXT NOT NULL,\n  latitude DOUBLE PRECISION NOT NULL,\n  longitude DOUBLE PRECISION NOT NULL,\n  updated_at TIMESTAMPTZ DEFAULT NOW()\n);`);
}

async function batchUpsert(rows: EnrichedZip3[]) {
  if (rows.length === 0) return;
  const { error } = await supabase.from('zip3_kma_geo').upsert(rows, { onConflict: 'zip3' });
  if (error) throw new Error(`Upsert failed: ${error.message}`);
  console.log(`Upserted batch of ${rows.length} rows`);
}

async function main() {
  const args = parseArgs();
  const mappingFile = args.file || args.f || path.join('data', 'dat_kma_mapping.csv');
  await ensureTable();
  const mapping = await loadMapping(mappingFile);
  console.log(`Loaded ${mapping.length} zip3 → KMA mappings`);

  const enriched: EnrichedZip3[] = [];
  for (let i = 0; i < mapping.length; i++) {
    const rec = mapping[i];
    const z = rec.zip3;
    const geo = await geocodeZip3(z);
    if (!geo) {
      console.warn(`Skipping zip3=${z} (no geo)`);
      continue;
    }
    enriched.push({ zip3: z, kma_code: rec.kma_code, latitude: geo.lat, longitude: geo.lng });
    console.log(`Enriched zip3=${z} → KMA=${rec.kma_code} lat=${geo.lat} lng=${geo.lng}`);
    if (enriched.length && enriched.length % 500 === 0) {
      await batchUpsert(enriched.splice(0, enriched.length));
    }
  }
  if (enriched.length) await batchUpsert(enriched);
  console.log('Backfill complete');
}

main().catch(err => {
  console.error('Fatal error', err);
  process.exit(1);
});