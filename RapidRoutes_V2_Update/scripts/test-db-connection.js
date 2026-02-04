// scripts/test-db-connection.js
import { createClient } from '@supabase/supabase-js';
import { fetch } from 'undici';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a test client with explicit fetch implementation
const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  global: { fetch }
});

async function testConnection() {
  console.log('Testing database connection...');
  
  try {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .limit(1);
      
    if (error) throw error;
    console.log('Connection successful!');
    console.log('Response:', data);
  } catch (error) {
    console.error('Connection failed:', error);
  }
}

testConnection();