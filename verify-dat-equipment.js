// verify-dat-equipment.js
// Compare current equipment with official DAT specification

const { adminSupabase } = require('./utils/supabaseClient.js');

// Official DAT Equipment Types from postsearchreference.pdf
const OFFICIAL_DAT_EQUIPMENT = [
  // Auto Carriers
  { code: 'AC', label: 'Auto Carrier', category: 'Auto Carrier' },
  { code: 'A2', label: 'Auto Carrier Double', category: 'Auto Carrier' },
  
  // B-Trains
  { code: 'BT', label: 'B-Train', category: 'B-Train' },
  
  // Conestoga
  { code: 'CN', label: 'Conestoga', category: 'Conestoga' },
  { code: 'C2', label: 'Conestoga Double', category: 'Conestoga' },
  
  // Containers
  { code: 'C', label: 'Container', category: 'Container' },
  { code: 'CI', label: 'Container Insulated', category: 'Container' },
  { code: 'CR', label: 'Container Refrigerated', category: 'Container' },
  { code: 'CV', label: 'Conveyor', category: 'Specialized' },
  
  // Double Drop
  { code: 'DD', label: 'Double Drop', category: 'Specialized' },
  { code: 'D2', label: 'Double Drop Double', category: 'Specialized' },
  
  // Dump
  { code: 'DT', label: 'Dump Trailer', category: 'Dump' },
  
  // Flatbed
  { code: 'F', label: 'Flatbed', category: 'Flatbed' },
  { code: 'FA', label: 'Flatbed Air-Ride', category: 'Flatbed' },
  { code: 'F2', label: 'Flatbed Double', category: 'Flatbed' },
  { code: 'FN', label: 'Flatbed Conestoga', category: 'Flatbed' },
  { code: 'FD', label: 'Flatbed or Step Deck', category: 'Flatbed' },
  { code: 'FO', label: 'Flatbed Overdimension', category: 'Flatbed' },
  { code: 'FC', label: 'Flatbed w/Chains', category: 'Flatbed' },
  { code: 'FS', label: 'Flatbed w/Sides', category: 'Flatbed' },
  { code: 'FT', label: 'Flatbed w/Tarps', category: 'Flatbed' },
  { code: 'FM', label: 'Flatbed w/Team', category: 'Flatbed' },
  { code: 'FZ', label: 'Flatbed HazMat', category: 'Flatbed' },
  { code: 'FH', label: 'Flatbed Hotshot', category: 'Flatbed' },
  { code: 'MX', label: 'Flatbed Maxi', category: 'Flatbed' },
  { code: 'FE', label: 'Flatbed Extended', category: 'Flatbed' },
  { code: 'FL', label: 'Flatbed Low', category: 'Flatbed' },
  { code: 'FR', label: 'Flatbed/Van/Reefer', category: 'Flatbed' },
  
  // Hopper
  { code: 'HB', label: 'Hopper Bottom', category: 'Hopper' },
  { code: 'HO', label: 'Hopper Open', category: 'Hopper' },
  
  // HazMat
  { code: 'HZ', label: 'Hazardous Materials', category: 'HazMat' },
  
  // Insulated
  { code: 'IR', label: 'Insulated Van or Reefer', category: 'Insulated' },
  
  // Landoll
  { code: 'LA', label: 'Drop Deck Landoll', category: 'Specialized' },
  
  // Lowboy
  { code: 'LB', label: 'Lowboy', category: 'Lowboy' },
  { code: 'LR', label: 'Lowboy or Rem Gooseneck (RGN)', category: 'Lowboy' },
  { code: 'LO', label: 'Lowboy Overdimension', category: 'Lowboy' },
  { code: 'LK', label: 'Lowboy King', category: 'Lowboy' },
  { code: 'LX', label: 'Lowboy Extended', category: 'Lowboy' },
  
  // Moving Van
  { code: 'MV', label: 'Moving Van', category: 'Moving Van' },
  { code: 'MA', label: 'Moving Van Air-Ride', category: 'Moving Van' },
  
  // Pneumatic
  { code: 'NU', label: 'Pneumatic', category: 'Pneumatic' },
  
  // Open Top
  { code: 'OT', label: 'Van Open-Top', category: 'Van' },
  
  // Power Only
  { code: 'PO', label: 'Power Only', category: 'Power Only' },
  { code: 'PL', label: 'Power Only Load Out', category: 'Power Only' },
  { code: 'PT', label: 'Power Only Tow Away', category: 'Power Only' },
  
  // Reefer
  { code: 'R', label: 'Reefer', category: 'Reefer' },
  { code: 'RA', label: 'Reefer Air-Ride', category: 'Reefer' },
  { code: 'R2', label: 'Reefer Double', category: 'Reefer' },
  { code: 'RN', label: 'Reefer Intermodal', category: 'Reefer' },
  { code: 'RL', label: 'Reefer Logistics', category: 'Reefer' },
  { code: 'RV', label: 'Reefer or Vented Van', category: 'Reefer' },
  { code: 'RP', label: 'Reefer Pallet Exchange', category: 'Reefer' },
  { code: 'RM', label: 'Reefer w/Team', category: 'Reefer' },
  { code: 'RZ', label: 'Reefer HazMat', category: 'Reefer' },
  
  // Removable Gooseneck
  { code: 'RG', label: 'Removable Gooseneck', category: 'RGN' },
  
  // Step Deck
  { code: 'SD', label: 'Step Deck', category: 'Step Deck' },
  { code: 'SR', label: 'Step Deck or Rem Gooseneck (RGN)', category: 'Step Deck' },
  { code: 'SN', label: 'Stepdeck Conestoga', category: 'Step Deck' },
  
  // Straight Box Truck - CRITICAL
  { code: 'SB', label: 'Straight Box Truck', category: 'Box Truck' },
  { code: 'BZ', label: 'Straight Box Truck HazMat', category: 'Box Truck' },
  { code: 'BR', label: 'Straight Box Truck Reefer', category: 'Box Truck' },
  
  // Sprinter Van
  { code: 'SV', label: 'Sprinter Van', category: 'Sprinter Van' },
  { code: 'SZ', label: 'Sprinter Van HazMat', category: 'Sprinter Van' },
  { code: 'SC', label: 'Sprinter Van Temp-Controlled', category: 'Sprinter Van' },
  { code: 'SM', label: 'Sprinter Van w/Team', category: 'Sprinter Van' },
  
  // Stretch
  { code: 'ST', label: 'Stretch Trailer', category: 'Stretch' },
  
  // Tanker
  { code: 'TA', label: 'Tanker Aluminum', category: 'Tanker' },
  { code: 'TN', label: 'Tanker Intermodal', category: 'Tanker' },
  { code: 'TS', label: 'Tanker Steel', category: 'Tanker' },
  
  // Truck and Trailer
  { code: 'TT', label: 'Truck and Trailer', category: 'Truck and Trailer' },
  
  // Van
  { code: 'V', label: 'Van', category: 'Van' },
  { code: 'VA', label: 'Van Air-Ride', category: 'Van' },
  { code: 'VW', label: 'Van Blanket Wrap', category: 'Van' },
  { code: 'VS', label: 'Van Conestoga', category: 'Van' },
  { code: 'V2', label: 'Van Double', category: 'Van' },
  { code: 'VZ', label: 'Van HazMat', category: 'Van' },
  { code: 'VH', label: 'Van Hotshot', category: 'Van' },
  { code: 'VI', label: 'Van Insulated', category: 'Van' },
  { code: 'VN', label: 'Van Intermodal', category: 'Van' },
  { code: 'VG', label: 'Van Lift-Gate', category: 'Van' },
  { code: 'VL', label: 'Van Logistics', category: 'Van' },
  { code: 'VF', label: 'Van or Flatbed', category: 'Van' },
  { code: 'VT', label: 'Van or Flatbed w/Tarps', category: 'Van' },
  { code: 'VR', label: 'Van or Reefer', category: 'Van' },
  { code: 'VP', label: 'Van Pallet Exchange', category: 'Van' },
  { code: 'VB', label: 'Van Roller Bed', category: 'Van' },
  { code: 'V3', label: 'Van Triple', category: 'Van' },
  { code: 'VV', label: 'Van Vented', category: 'Van' },
  { code: 'VC', label: 'Van w/Curtains', category: 'Van' },
  { code: 'VM', label: 'Van w/Team', category: 'Van' }
];

async function verifyDATEquipment() {
  console.log('🔍 Verifying DAT Equipment Types Coverage...');
  console.log(`📋 Official DAT specification has ${OFFICIAL_DAT_EQUIPMENT.length} equipment types`);
  
  try {
    // Get current equipment from database
    const { data: currentEquipment, error } = await adminSupabase
      .from('equipment_codes')
      .select('code, label')
      .order('code');
      
    if (error) {
      console.error('❌ Error fetching current equipment:', error);
      return;
    }
    
    console.log(`📊 Current database has ${currentEquipment.length} equipment types`);
    
    // Find missing equipment types
    const currentCodes = new Set(currentEquipment.map(eq => eq.code));
    const missing = OFFICIAL_DAT_EQUIPMENT.filter(official => !currentCodes.has(official.code));
    
    if (missing.length > 0) {
      console.log(`\n❌ MISSING ${missing.length} DAT equipment types:`);
      missing.forEach(eq => console.log(`  - ${eq.code}: ${eq.label} (${eq.category})`));
    } else {
      console.log('\n✅ All official DAT equipment types are present!');
    }
    
    // Check for SB specifically
    const hasSB = currentCodes.has('SB');
    console.log(`\n🎯 Straight Box Truck (SB): ${hasSB ? '✅ Present' : '❌ MISSING'}`);
    
    // Show critical equipment types
    const critical = ['SB', 'V', 'R', 'F', 'FD', 'SD', 'AC', 'BT', 'CN'];
    console.log('\n🔥 Critical Equipment Types Status:');
    critical.forEach(code => {
      const present = currentCodes.has(code);
      const official = OFFICIAL_DAT_EQUIPMENT.find(eq => eq.code === code);
      console.log(`  ${code}: ${present ? '✅' : '❌'} ${official?.label || 'Unknown'}`);
    });
    
    return { missing, currentCount: currentEquipment.length, officialCount: OFFICIAL_DAT_EQUIPMENT.length };
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run verification
verifyDATEquipment().then((result) => {
  if (result) {
    console.log(`\n📈 Coverage: ${result.currentCount}/${result.officialCount} (${Math.round(result.currentCount/result.officialCount*100)}%)`);
  }
}).catch(console.error);
