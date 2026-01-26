#!/usr/bin/env node
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  try {
    const { data, error } = await supabase.from('lanes').select('id').limit(1);
    if (error) {
      console.error('Admin select failed:', error.message);
      process.exit(1);
    }
    console.log('Admin client connected. Sample row:', Array.isArray(data) ? data[0] : data);
    process.exit(0);
  } catch (e) {
    console.error('Exception testing admin connection:', e.message);
    process.exit(1);
  }
}

main();
