// check-profiles-structure.js - Check actual profiles table structure
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gwuhjxomavulwduhvgvi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkTableStructure() {
  console.log('=== PROFILES TABLE STRUCTURE CHECK ===\n');
  
  try {
    console.log('1. Trying basic profile query...');
    const { data: sampleData, error: sampleError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
      
    if (sampleError) {
      console.log('❌ Basic query failed:', sampleError.message);
    } else if (sampleData && sampleData.length > 0) {
      console.log('✅ Sample profile data:');
      console.log('Available columns:', Object.keys(sampleData[0]));
      console.log('Sample:', sampleData[0]);
    } else {
      console.log('ℹ️  No profiles found, trying to get schema another way...');
    }
    
    // Check individual columns
    console.log('\n2. Checking individual columns...');
    
    const testColumns = [
      'id', 'email', 'role', 'status', 'active', 'created_at', 'updated_at'
    ];
    
    for (const col of testColumns) {
      const { error } = await supabase
        .from('profiles')
        .select(col)
        .limit(1);
        
      if (error) {
        console.log(`❌ Column '${col}' missing: ${error.message}`);
      } else {
        console.log(`✅ Column '${col}' exists`);
      }
    }
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

checkTableStructure();
