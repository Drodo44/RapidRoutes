// debug-login.js - Comprehensive login system analysis
const { supabase } = require('./utils/supabaseClient.js');

async function debugLogin() {
  console.log('=== LOGIN SYSTEM DEBUG ===\n');
  
  // 1. Test Supabase connection
  console.log('1. Testing Supabase Connection:');
  try {
    const { data: testData, error: testError } = await supabase.from('profiles').select('count').single();
    if (testError) {
      console.log('❌ Supabase connection failed:', testError.message);
      return;
    }
    console.log('✅ Supabase connection working');
  } catch (err) {
    console.log('❌ Supabase client error:', err.message);
    return;
  }
  
  // 2. Check current session
  console.log('\n2. Current Session Check:');
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.log('❌ Session check failed:', sessionError.message);
  } else if (session) {
    console.log('✅ Active session found for:', session.user.email);
    console.log('   User ID:', session.user.id);
    console.log('   Expires:', new Date(session.expires_at * 1000).toISOString());
  } else {
    console.log('ℹ️  No active session');
  }
  
  // 3. Check profiles table structure
  console.log('\n3. Profiles Table Analysis:');
  try {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, role, status, active, created_at')
      .limit(10);
    
    if (profilesError) {
      console.log('❌ Profiles query failed:', profilesError.message);
    } else {
      console.log(`✅ Found ${profiles.length} profiles:`);
      profiles.forEach(p => {
        console.log(`   ${p.email || 'No email'} | ${p.role} | ${p.status} | Active: ${p.active}`);
      });
    }
  } catch (err) {
    console.log('❌ Profiles table error:', err.message);
  }
  
  // 4. Check for orphaned auth users
  console.log('\n4. Checking for Auth/Profile Mismatches:');
  try {
    // Note: We can't directly query auth.users from client, but we can check RLS policies
    const { data: rpcResult, error: rpcError } = await supabase.rpc('get_user_count');
    if (rpcError && rpcError.code !== 'PGRST202') {
      console.log('ℹ️  Cannot check auth.users directly (RLS restriction)');
    }
  } catch (err) {
    console.log('ℹ️  Auth user count check not available');
  }
  
  // 5. Test profile creation trigger
  console.log('\n5. Testing Profile Creation System:');
  try {
    // We'll check if the trigger function exists
    const { data: triggerCheck, error: triggerError } = await supabase.rpc('check_trigger_exists');
    if (triggerError && triggerError.code !== 'PGRST202') {
      console.log('ℹ️  Cannot verify trigger directly');
    }
  } catch (err) {
    console.log('ℹ️  Trigger verification not available');
  }
  
  console.log('\n=== RECOMMENDATIONS ===');
  
  // Analyze findings
  if (session) {
    console.log('🔍 User has active session - check profile matching:');
    try {
      const { data: userProfile, error: userProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (userProfileError) {
        console.log('❌ CRITICAL: User has session but no profile!');
        console.log('   User ID:', session.user.id);
        console.log('   User Email:', session.user.email);
        console.log('   Error:', userProfileError.message);
        console.log('   🔧 FIX: Create missing profile for user');
      } else if (!userProfile.active) {
        console.log('⚠️  User profile exists but is inactive');
        console.log('   Status:', userProfile.status);
        console.log('   Role:', userProfile.role);
        console.log('   🔧 FIX: Activate profile or approve user');
      } else {
        console.log('✅ User session and profile both valid');
        console.log('   Status:', userProfile.status);
        console.log('   Role:', userProfile.role);
      }
    } catch (err) {
      console.log('❌ Error checking user profile:', err.message);
    }
  } else {
    console.log('ℹ️  No session - login flow should work normally');
  }
}

debugLogin().catch(console.error);
