// get-auth-token.js
// Script to get an auth token from the session
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Check for environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables.');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env file');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test email and password should be provided as arguments
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('❌ Missing email or password arguments.');
  console.error('Usage: node get-auth-token.js EMAIL PASSWORD');
  process.exit(1);
}

async function getAuthToken() {
  try {
    console.log(`🔐 Logging in with email: ${email}`);
    
    // Sign in with email and password
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('❌ Authentication failed:', error.message);
      process.exit(1);
    }
    
    if (!data || !data.session || !data.session.access_token) {
      console.error('❌ No session or token returned');
      process.exit(1);
    }
    
    // Get the access token
    const token = data.session.access_token;
    
    console.log('✅ Successfully authenticated');
    console.log(`🔑 Access token: ${token.substring(0, 20)}...`);
    
    // Save token to environment variable for easy use
    fs.writeFileSync('.env.token', `AUTH_TOKEN=${token}`);
    console.log('💾 Token saved to .env.token file');
    console.log('\nTo use with verification script:');
    console.log('export AUTH_TOKEN=$(cat .env.token | cut -d= -f2)');
    console.log('node api-verification-test.js $AUTH_TOKEN');
    
    // Return the token
    return token;
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

// Run the function
getAuthToken();