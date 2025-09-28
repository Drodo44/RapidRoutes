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

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const HERE_API_KEY = process.env.HERE_API_KEY || process.env.HERE_API_KEY_PRIMARY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}
if (!HERE_API_KEY) {
  console.error('HERE_API_KEY missing.');
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
  if (!fs.existsSync(filePath)) {
    throw new Error(`Mapping file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  if (filePath.endsWith('.json')) {
    const json = JSON.parse(raw);
    return Object.entries(json).map(([zip3, kma_code]) => ({ zip3, kma_code: String(kma_code) }));
  }
  // CSV parsing (simple) expecting headers containing zip3,kma_code
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  const header = lines.shift()!.split(',').map(h => h.trim().toLowerCase());
  const zipIdx = header.indexOf('zip3');
  const kmaIdx = header.indexOf('kma_code');
  if (zipIdx === -1 || kmaIdx === -1) throw new Error('CSV must contain zip3,kma_code headers');
  const rows: Zip3Record[] = [];
  for (const line of lines) {
    const cols = line.split(',');
    const zip3 = cols[zipIdx]?.trim();
    const kma_code = cols[kmaIdx]?.trim();
    if (/^\d{3}$/.test(zip3) && kma_code) rows.push({ zip3, kma_code });
  }
  return rows;
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