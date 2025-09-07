// add-active-column.js - Direct approach to add active column
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gwuhjxomavulwduhvgvi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function addActiveColumn() {
  console.log('=== ADDING ACTIVE COLUMN ===\n');
  
  try {
    // Create a database function to add the column
    console.log('1. Creating SQL function to add column...');
    
    const addColumnFunction = `
      CREATE OR REPLACE FUNCTION add_active_column()
      RETURNS void AS $$
      BEGIN
        BEGIN
          ALTER TABLE profiles ADD COLUMN active BOOLEAN DEFAULT false;
          EXCEPTION
            WHEN duplicate_column THEN
              -- Column already exists, ignore
              NULL;
        END;
        
        -- Set active=true for approved users
        UPDATE profiles SET active = true WHERE status = 'approved';
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    const { error: createFunctionError } = await supabase.rpc('exec_sql', {
      sql: addColumnFunction
    });
    
    if (createFunctionError) {
      console.log('Function creation failed, trying direct approach...');
      
      // Alternative: Try using a different method
      const { error: directError } = await supabase.rpc('add_active_column_direct');
      if (directError) {
        console.log('❌ Direct approach failed:', directError.message);
        
        // Show manual instructions
        console.log('\n🔧 MANUAL APPROACH REQUIRED:');
        console.log('1. Go to Supabase Dashboard → SQL Editor');
        console.log('2. Run this SQL:');
        console.log('   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT false;');
        console.log('   UPDATE profiles SET active = true WHERE status = \'approved\';');
        console.log('3. Then restart the app and try logging in');
      }
    } else {
      console.log('✅ Function created, executing...');
      
      const { error: execError } = await supabase.rpc('add_active_column');
      
      if (execError) {
        console.log('❌ Execution failed:', execError.message);
      } else {
        console.log('✅ Active column added successfully!');
      }
    }
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
    console.log('\n🔧 MANUAL APPROACH REQUIRED:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Run this SQL:');
    console.log('   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT false;');
    console.log('   UPDATE profiles SET active = true WHERE status = \'approved\';');
  }
}

addActiveColumn();
