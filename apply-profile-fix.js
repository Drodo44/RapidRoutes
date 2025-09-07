// apply-profile-fix.js - Apply the profile table fix
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gwuhjxomavulwduhvgvi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function applyFix() {
  console.log('=== APPLYING PROFILE TABLE FIX ===\n');
  
  try {
    console.log('1. Adding missing active column...');
    // Use direct update approach since we can't run DDL via RPC easily
    console.log('   Note: Adding column via manual SQL required');
    
    console.log('\n2. Setting active=true for approved users...');
    const { error: updateError1 } = await supabase
      .from('profiles')
      .update({ active: true })
      .eq('status', 'approved');
      
    if (updateError1) {
      console.log('❌ Failed to update active status:', updateError1.message);
      console.log('   This is expected if active column does not exist yet');
    } else {
      console.log('✅ Updated active status for approved users');
    }
    
    console.log('\n3. Fixing TQL users to be Admins...');
    const { error: updateError2 } = await supabase
      .from('profiles')
      .update({ 
        role: 'Admin',
        status: 'approved'
      })
      .like('email', '%@tql.com');
      
    if (updateError2) {
      console.log('❌ Failed to update TQL users:', updateError2.message);
    } else {
      console.log('✅ Updated TQL users to Admin role');
    }
    
    console.log('\n4. Checking current profiles...');
    const { data: profiles, error: selectError } = await supabase
      .from('profiles')
      .select('id, email, role, status')
      .order('email');
      
    if (selectError) {
      console.log('❌ Failed to query profiles:', selectError.message);
    } else {
      console.log('✅ Current profiles:');
      profiles.forEach(p => {
        const roleIcon = p.role === 'Admin' ? '👑' : '👤';
        const statusIcon = p.status === 'approved' ? '✅' : '⚠️';
        console.log(`   ${statusIcon} ${roleIcon} ${p.email} - ${p.role} (${p.status})`);
      });
    }
    
    console.log('\n=== MANUAL STEP REQUIRED ===');
    console.log('🔧 Run this SQL in Supabase dashboard:');
    console.log('   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT false;');
    console.log('   UPDATE profiles SET active = true WHERE status = \'approved\';');
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

applyFix();
