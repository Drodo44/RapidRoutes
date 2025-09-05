// tests/testSetup.js
import { createClient } from '@supabase/supabase-js';

export const testConfig = {
    supabaseUrl: 'https://gwuhjxomavulwduhvgvi.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Mzk2MjksImV4cCI6MjA2NzUxNTYyOX0.fM8EeVag9MREyjBVv2asGpIgI_S7k_889kDDbE-8oUs'
};

export const testSupabase = createClient(testConfig.supabaseUrl, testConfig.supabaseKey);
