import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkImages() {
  console.log('Checking uploaded heat map images...\n');
  
  const { data, error } = await adminSupabase
    .from('dat_market_images')
    .select('*')
    .order('uploaded_at', { ascending: false });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('❌ No images found in database.');
    return;
  }
  
  console.log(`✅ Found ${data.length} uploaded image(s):\n`);
  data.forEach((img, idx) => {
    console.log(`${idx + 1}. Equipment: ${img.equipment_type}`);
    console.log(`   URL: ${img.image_url}`);
    console.log(`   Filename: ${img.filename}`);
    console.log(`   Size: ${(img.file_size / 1024).toFixed(2)} KB`);
    console.log(`   Uploaded: ${img.uploaded_at}`);
    console.log('');
  });
}

checkImages();
