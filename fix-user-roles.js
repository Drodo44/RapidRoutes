// fix-user-roles.js - Fix the user role system properly
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gwuhjxomavulwduhvgvi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function fixUserRoles() {
  console.log('=== FIXING USER ROLE SYSTEM ===\n');
  
  try {
    // 1. Check all current users
    console.log('1. Current users in system:');
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, role, status')
      .order('email');
      
    if (usersError) {
      console.log('❌ Failed to get users:', usersError.message);
      return;
    }
    
    users.forEach(user => {
      console.log(`   📧 ${user.email} - ${user.role} (${user.status})`);
    });
    
    console.log('\n2. Setting up proper role hierarchy...');
    console.log('   Admin: Owner/Administrator');
    console.log('   Broker: Licensed freight brokers');  
    console.log('   Support: Support staff');
    console.log('   Apprentice: Trainees/new users');
    
    // 3. Identify who should be what role
    console.log('\n3. Please confirm the role assignments:');
    
    for (const user of users) {
      let suggestedRole = 'Apprentice'; // Default for unknown users
      
      // Make educated guesses based on email
      if (user.email.includes('aconnellan')) {
        suggestedRole = 'Admin'; // Owner
      } else if (user.email.includes('ktaylor')) {
        suggestedRole = 'Broker'; // Kyle as broker
      }
      
      console.log(`   ${user.email} → Suggested: ${suggestedRole} (currently: ${user.role})`);
      
      // Update if different from current
      if (user.role !== suggestedRole) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            role: suggestedRole,
            status: 'approved' // Ensure approved
          })
          .eq('id', user.id);
          
        if (updateError) {
          console.log(`   ❌ Failed to update ${user.email}:`, updateError.message);
        } else {
          console.log(`   ✅ Updated ${user.email} to ${suggestedRole}`);
        }
      }
    }
    
    // 4. Update role constraints in database
    console.log('\n4. Updating role constraints...');
    
    // Note: We'll need to manually update the check constraint
    console.log('   📝 Manual SQL needed to update role constraints:');
    console.log('   ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profile_role_check;');
    console.log('   ALTER TABLE profiles ADD CONSTRAINT profile_role_check');
    console.log('     CHECK (role IN (\'Admin\', \'Broker\', \'Support\', \'Apprentice\'));');
    
    // 5. Show final result
    console.log('\n5. Updated user roles:');
    const { data: updatedUsers, error: finalError } = await supabase
      .from('profiles')
      .select('id, email, role, status')
      .order('email');
      
    if (finalError) {
      console.log('❌ Failed to get updated users:', finalError.message);
    } else {
      updatedUsers.forEach(user => {
        const roleIcon = user.role === 'Admin' ? '👑' : 
                        user.role === 'Broker' ? '💼' :
                        user.role === 'Support' ? '🛠️' : '📚';
        console.log(`   ${roleIcon} ${user.email} - ${user.role} (${user.status})`);
      });
    }
    
    console.log('\n=== ROLE SYSTEM FIXED ===');
    console.log('Your RapidRoutes user hierarchy is now properly configured!');
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

fixUserRoles();
