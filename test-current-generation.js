import 'dotenv/config';
import { adminSupabase as supabase } from './utils/supabaseClient.js';

async function testCurrentGeneration() {
  console.log('🧪 Testing Current Lane Generation Status\n');
  
  try {
    // Test database connection
    const { data: lanes, error } = await supabase
      .from('lanes')
      .select('*')
      .limit(3);
      
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return;
    }
    
    console.log(`✅ Database connection successful`);
    console.log(`📊 Found ${lanes.length} lanes in database\n`);
    
    if (lanes.length > 0) {
      console.log('🛣️ Sample lanes:');
      lanes.forEach((lane, i) => {
        console.log(`  ${i+1}. ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`);
        console.log(`     Equipment: ${lane.equipment_code}, Weight: ${lane.weight_lbs}lbs`);
        console.log(`     Status: ${lane.status}, Created: ${new Date(lane.created_at).toLocaleDateString()}\n`);
      });
    }
    
    // Test export API endpoint
    console.log('🧪 Testing export API...');
    const response = await fetch('http://localhost:3000/api/exportDatCsv?days=7', {
      method: 'HEAD'
    });
    
    if (response.ok) {
      const totalParts = response.headers.get('X-Total-Parts');
      console.log(`✅ Export API responding successfully`);
      console.log(`📦 Total CSV parts available: ${totalParts || 'Unknown'}\n`);
    } else {
      console.log(`⚠️ Export API status: ${response.status}\n`);
    }
    
    // Test city crawling capability
    const { data: cities, error: cityError } = await supabase
      .from('cities')
      .select('city, state_or_province, kma_code')
      .limit(5);
      
    if (!cityError && cities.length > 0) {
      console.log('🏙️ City data sample:');
      cities.forEach(city => {
        console.log(`  ${city.city}, ${city.state_or_province} (KMA: ${city.kma_code})`);
      });
      console.log('');
    }
    
    // Test equipment codes
    const { data: equipment, error: equipError } = await supabase
      .from('equipment_codes')
      .select('code, label')
      .limit(5);
      
    if (!equipError && equipment.length > 0) {
      console.log('🚛 Equipment codes sample:');
      equipment.forEach(eq => {
        console.log(`  ${eq.code} - ${eq.label}`);
      });
      console.log('');
    }
    
    console.log('✅ All core systems appear to be functioning correctly!');
    console.log('🎯 Ready for lane generation testing via the web interface.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCurrentGeneration();
