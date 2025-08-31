import { adminSupabase } from './utils/supabaseClient.js';

async function checkCurrentState() {
  console.log('🔍 CHECKING CURRENT APPLICATION STATE');
  
  try {
    // Check lanes count
    const { data: lanes, error: lanesError } = await adminSupabase
      .from('lanes')
      .select('*')
      .limit(3);
      
    if (lanesError) {
      console.log('❌ Error fetching lanes:', lanesError.message);
    } else {
      console.log('📊 Current lanes in database:', lanes.length);
      if (lanes.length > 0) {
        console.log('📋 Sample lane:');
        console.log(`   Origin: ${lanes[0].origin_city}, ${lanes[0].origin_state}`);
        console.log(`   Dest: ${lanes[0].dest_city}, ${lanes[0].dest_state}`);
        console.log(`   Equipment: ${lanes[0].equipment_code}`);
        console.log(`   Status: ${lanes[0].status}`);
      }
    }
    
    // Check equipment codes
    const { data: equipment, error: equipError } = await adminSupabase
      .from('equipment_codes')
      .select('code, label')
      .limit(5);
      
    if (equipError) {
      console.log('❌ Error fetching equipment:', equipError.message);
    } else {
      console.log('🚛 Equipment codes available:', equipment.length);
      if (equipment.length > 0) {
        console.log('📋 Sample equipment:', equipment.slice(0, 3));
      }
    }
    
    // Check cities count
    const { count: citiesCount, error: citiesError } = await adminSupabase
      .from('cities')
      .select('id', { count: 'exact', head: true });
      
    if (citiesError) {
      console.log('❌ Error fetching cities count:', citiesError.message);
    } else {
      console.log('🏙️ Cities in database:', citiesCount);
    }

  } catch (error) {
    console.log('❌ Error in check:', error.message);
  }
  
  process.exit(0);
}

checkCurrentState();
