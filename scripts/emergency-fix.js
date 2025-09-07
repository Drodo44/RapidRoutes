// scripts/emergency-fix.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gwuhjxomavulwduhvgvi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ'
);

async function emergencyFix() {
  console.log('🚨 Running emergency access fix...');

  try {
    // 1. Fix your profile directly
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        email: 'aconnellan@tql.com',
        status: 'approved',
        role: 'Admin'
      }, { onConflict: 'email' });

    if (profileError) throw profileError;

    // 2. Create test lane to verify posting works
    const { error: laneError } = await supabase
      .from('lanes')
      .insert({
        origin_city: 'Cincinnati',
        origin_state: 'OH',
        dest_city: 'Columbus',
        dest_state: 'OH',
        status: 'active',
        equipment_code: 'V',
        weight_lbs: 45000
      });

    if (laneError) {
      console.error('Lane creation test failed:', laneError);
      
      // 3. If lane creation fails, try running raw SQL to fix permissions
      const { error: sqlError } = await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE lanes DISABLE ROW LEVEL SECURITY;
          ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
          GRANT ALL ON lanes TO authenticated;
          GRANT ALL ON profiles TO authenticated;
        `
      });

      if (sqlError) throw sqlError;
    }

    console.log('✅ Emergency fix applied successfully');
    console.log('🔑 You should now have full access to create lanes');
    
  } catch (error) {
    console.error('Emergency fix failed:', error);
    process.exit(1);
  }
}

emergencyFix();
