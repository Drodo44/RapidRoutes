// test-profile-fetch.js
const { supabase } = require('./utils/supabaseClient.js');

(async () => {
  try {
    console.log('Testing profile fetch...');
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Session status:', !!session, session?.user?.id);
    
    if (session?.user) {
      console.log('Attempting profile fetch...');
      const start = Date.now();
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      const duration = Date.now() - start;
      console.log('Query completed in', duration + 'ms');
      
      if (error) {
        console.log('Profile error:', error.message, error.code);
      } else {
        console.log('Profile found:', profile?.email, profile?.role, profile?.status);
      }
    } else {
      console.log('No session - need to login first');
    }
  } catch (err) {
    console.error('Exception:', err.message);
  }
})();
