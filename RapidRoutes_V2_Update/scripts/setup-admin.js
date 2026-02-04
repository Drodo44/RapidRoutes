// scripts/setup-admin.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = 'https://gwuhjxomavulwduhvgvi.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function makeAdmin(email) {
  try {
    const { data, error } = await supabase.rpc('make_admin', { email });
    
    if (error) throw error;
    
    console.log(`✅ Successfully made ${email} an admin`);
    
    // Verify the profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();
    
    if (profileError) throw profileError;
    
    console.log('Profile status:', profile);
    
  } catch (error) {
    console.error('Failed to set admin role:', error);
  }
}

// Make admin
const email = 'aconnellan@tql.com';
console.log(`🔑 Setting up admin role for ${email}...`);
makeAdmin(email);
