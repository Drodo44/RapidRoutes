// setup-admin.js - Create initial admin user
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gwuhjxomavulwduhvgvi.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.log('❌ Missing environment variables:');
  console.log('SUPABASE_URL:', !!SUPABASE_URL);
  console.log('SERVICE_KEY:', !!SERVICE_KEY);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function setupAdmin() {
  console.log('=== ADMIN SETUP ===\n');
  
  try {
    // 1. Check existing users
    console.log('1. Checking existing profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, role, status, active')
      .order('created_at', { ascending: false });
      
    if (profilesError) {
      console.log('❌ Failed to query profiles:', profilesError.message);
      return;
    }
    
    console.log(`Found ${profiles.length} total profiles:`);
    profiles.forEach(p => {
      const statusIcon = p.role === 'Admin' ? '👑' : (p.active ? '✅' : '⚠️');
      console.log(`   ${statusIcon} ${p.email || 'No email'} - ${p.role} (${p.status}, active: ${p.active})`);
    });
    
    // 2. Check for admin users
    const adminUsers = profiles.filter(p => p.role === 'Admin' && p.status === 'approved' && p.active);
    
    if (adminUsers.length > 0) {
      console.log(`\n✅ Found ${adminUsers.length} active admin user(s):`);
      adminUsers.forEach(admin => console.log(`   👑 ${admin.email}`));
      console.log('\nAuth system should be working correctly.');
      return;
    }
    
    console.log('\n⚠️  No active admin users found!');
    
    // 3. Look for TQL users to promote
    const tqlUsers = profiles.filter(p => p.email && p.email.includes('@tql.com'));
    
    if (tqlUsers.length > 0) {
      console.log('\n🔧 Found TQL users to promote to admin:');
      for (const user of tqlUsers) {
        console.log(`   Promoting ${user.email} to Admin...`);
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            role: 'Admin',
            status: 'approved',
            active: true
          })
          .eq('id', user.id);
          
        if (updateError) {
          console.log(`   ❌ Failed to promote ${user.email}:`, updateError.message);
        } else {
          console.log(`   ✅ Promoted ${user.email} to Admin`);
        }
      }
    } else {
      console.log('\n🔧 No TQL users found. Checking auth.users table...');
      
      // 4. Get users from auth table (if possible)
      try {
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
          console.log('❌ Cannot access auth.users:', authError.message);
        } else {
          console.log(`Found ${authUsers.users.length} auth users:`);
          
          for (const authUser of authUsers.users) {
            console.log(`   📧 ${authUser.email} (${authUser.id})`);
            
            // Check if profile exists
            const existingProfile = profiles.find(p => p.id === authUser.id);
            
            if (!existingProfile) {
              console.log(`   🔧 Creating missing profile for ${authUser.email}...`);
              
              const { error: insertError } = await supabase
                .from('profiles')
                .insert({
                  id: authUser.id,
                  email: authUser.email,
                  role: authUser.email.includes('@tql.com') ? 'Admin' : 'User',
                  status: authUser.email.includes('@tql.com') ? 'approved' : 'pending',
                  active: authUser.email.includes('@tql.com')
                });
                
              if (insertError) {
                console.log(`   ❌ Failed to create profile:`, insertError.message);
              } else {
                console.log(`   ✅ Created profile for ${authUser.email}`);
              }
            }
          }
        }
      } catch (err) {
        console.log('⚠️  Cannot access auth users directly');
      }
    }
    
    console.log('\n=== RECOMMENDATIONS ===');
    console.log('1. Try logging in with a TQL email address');
    console.log('2. If login fails, check the browser console for errors');
    console.log('3. Ensure the trigger function is working for profile creation');
    
  } catch (error) {
    console.log('❌ Setup failed:', error.message);
  }
}

setupAdmin();
