import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing environment variables!');
  process.exit(1);
}

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkStorage() {
  console.log('Checking Supabase Storage buckets...\n');
  
  // List all buckets
  const { data: buckets, error: listError } = await adminSupabase.storage.listBuckets();
  
  if (listError) {
    console.error('Error listing buckets:', listError);
    return;
  }
  
  console.log('Available buckets:');
  buckets.forEach(bucket => {
    console.log(`  - ${bucket.name} (public: ${bucket.public})`);
  });
  
  // Check if dat_maps exists
  const datMapsBucket = buckets.find(b => b.name === 'dat_maps');
  
  if (!datMapsBucket) {
    console.log('\n❌ dat_maps bucket does NOT exist. Creating it now...\n');
    
    const { data: createData, error: createError } = await adminSupabase.storage.createBucket('dat_maps', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
    });
    
    if (createError) {
      console.error('Failed to create bucket:', createError);
    } else {
      console.log('✅ dat_maps bucket created successfully!');
    }
  } else {
    console.log('\n✅ dat_maps bucket exists!');
  }
}

checkStorage();
