// Get user ID for cleanup
// Run this with: node get-user-id.mjs

import { adminSupabase } from './lib/supabaseAdmin.js';

async function getUserInfo() {
  try {
    // Get all users from auth
    const { data: { users }, error: authError } = await adminSupabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching users:', authError);
      return;
    }

    console.log('\n📋 All Users in System:\n');
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   User ID: ${user.id}`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Last Sign In: ${user.last_sign_in_at || 'Never'}\n`);
    });

    // Check what data each user has
    console.log('\n📊 Data Overview:\n');
    
    for (const user of users) {
      const { data: lanes, error } = await adminSupabase
        .from('lanes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { data: pairs } = await adminSupabase
        .from('posted_pairs')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', user.id);

      console.log(`${user.email}:`);
      console.log(`  - Lanes: ${lanes?.length || 0}`);
      console.log(`  - Posted Pairs: ${pairs?.length || 0}`);
      console.log(`  - User ID: ${user.id}\n`);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

getUserInfo();
