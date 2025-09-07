// test-auth-flow.js - Test the complete authentication flow
import { supabase } from './utils/supabaseClient.js';

async function testAuthFlow() {
  console.log('=== AUTHENTICATION FLOW TEST ===\n');
  
  try {
    // 1. Check current session
    console.log('1. Checking current session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Session check failed:', sessionError.message);
      return;
    }
    
    if (session) {
      console.log('✅ Active session found');
      console.log('   User:', session.user.email);
      console.log('   Expires:', new Date(session.expires_at * 1000));
      
      // Check user profile
      console.log('\n2. Checking user profile...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (profileError) {
        console.log('❌ Profile error:', profileError.message);
        console.log('🔧 User has session but no profile - this breaks authentication!');
      } else {
        console.log('✅ Profile found');
        console.log('   Status:', profile.status);
        console.log('   Role:', profile.role);
        console.log('   Active:', profile.active);
        console.log('   Email:', profile.email);
        
        if (profile.status !== 'approved' || !profile.active) {
          console.log('⚠️  Profile exists but user is not approved/active');
        } else {
          console.log('✅ User is fully authenticated and approved');
        }
      }
    } else {
      console.log('ℹ️  No active session - user needs to log in');
    }
    
    // 3. Test database connectivity
    console.log('\n3. Testing database connectivity...');
    const { data: testQuery, error: dbError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
      
    if (dbError) {
      console.log('❌ Database connection failed:', dbError.message);
    } else {
      console.log('✅ Database connection working');
    }
    
    // 4. Check table structure
    console.log('\n4. Checking profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, role, status, active')
      .limit(5);
      
    if (profilesError) {
      console.log('❌ Profiles query failed:', profilesError.message);
    } else {
      console.log(`✅ Found ${profiles.length} profiles in database`);
      profiles.forEach(p => {
        const statusIcon = p.active && p.status === 'approved' ? '✅' : '⚠️';
        console.log(`   ${statusIcon} ${p.email || 'No email'} - ${p.role} (${p.status})`);
      });
    }
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

// Check if running in Node.js vs browser
if (typeof window === 'undefined') {
  testAuthFlow();
} else {
  console.log('Auth flow test ready - call testAuthFlow() from browser console');
  window.testAuthFlow = testAuthFlow;
}

export { testAuthFlow };
