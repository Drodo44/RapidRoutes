// scripts/setup-admin-fixed.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = 'https://gwuhjxomavulwduhvgvi.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function makeAdmin(admin_email) {
  try {
    // Call the function with correctly named parameter
    const { data, error } = await supabase.rpc('make_admin', { admin_email });
    
    if (error) throw error;
    
    console.log(`✅ Successfully made ${admin_email} an admin`);
    
    // Verify the change by checking the profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', admin_email)
      .single();
    
    if (profileError) throw profileError;
    
    console.log('Profile status:', profile);
    
  } catch (error) {
    console.error('Failed to set admin role:', error);
    throw error; // Re-throw to see full error in console
  }
}

const email = 'aconnellan@tql.com';
console.log(`🔑 Setting up admin role for ${email}...`);
makeAdmin(email);
