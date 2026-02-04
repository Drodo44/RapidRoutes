// scripts/test-db-connection-node-fetch.js
import nodeFetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import https from 'https';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create HTTPS agent with more lenient SSL settings
const agent = new https.Agent({
  rejectUnauthorized: false
});

// Create custom fetch function with our agent
const customFetch = (url, options) => {
  return nodeFetch(url, { ...options, agent });
};

// Create a test client with our custom fetch
const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  global: { fetch: customFetch }
});

async function testConnection() {
  console.log('Testing database connection with node-fetch...');
  
  try {
    const { data, error } = await supabase
      .from('cities')
      .select('count(*)')
      .limit(1);
      
    if (error) throw error;
    console.log('Connection successful!');
    console.log('Response:', data);
  } catch (error) {
    console.error('Connection failed:', error);
  }
}

testConnection();