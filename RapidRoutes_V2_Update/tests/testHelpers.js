// tests/testHelpers.js
import { testConfig, testSupabase } from './testSetup.js';

export function setupTestEnvironment() {
  // Set environment variables for testing
  process.env.NEXT_PUBLIC_SUPABASE_URL = testConfig.supabaseUrl;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = testConfig.supabaseKey;
  
  return {
    config: testConfig,
    supabase: testSupabase
  };
}
