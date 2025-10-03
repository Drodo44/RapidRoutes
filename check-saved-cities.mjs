import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n🔍 CHECKING ACTUAL DATABASE STATE...\n');

// Check active lanes
const { data: activeLanes, error: laneError } = await supabase
  .from('lanes')
  .select('*')
  .eq('lane_status', 'active')
  .order('created_at', { ascending: false });

console.log('📦 ACTIVE LANES:', activeLanes?.length || 0);
if (activeLanes?.length > 0) {
  activeLanes.forEach((lane, i) => {
    console.log(`  ${i+1}. Lane ID: ${lane.id}, RR#${lane.reference_id}, ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city || lane.destination_city}, ${lane.dest_state || lane.destination_state}`);
  });
}

// Check city choices
console.log('\n📍 SAVED CITY CHOICES:');
const { data: cityChoices, error: choiceError } = await supabase
  .from('lane_city_choices')
  .select('*')
  .order('created_at', { ascending: false });

console.log(`Total saved city choices: ${cityChoices?.length || 0}`);
if (cityChoices?.length > 0) {
  // Group by lane_id
  const grouped = {};
  cityChoices.forEach(choice => {
    if (!grouped[choice.lane_id]) grouped[choice.lane_id] = [];
    grouped[choice.lane_id].push(choice);
  });
  
  console.log(`\nGrouped by lane (${Object.keys(grouped).length} lanes have choices):`);
  Object.entries(grouped).forEach(([laneId, choices]) => {
    console.log(`\n  Lane ID ${laneId} (RR#${choices[0].rr_number}):`);
    choices.slice(0, 5).forEach((choice, i) => {
      console.log(`    ${i+1}. ${choice.origin_city}, ${choice.origin_state} → ${choice.destination_city}, ${choice.destination_state}`);
    });
    if (choices.length > 5) console.log(`    ... and ${choices.length - 5} more`);
  });
}

// Check if lane IDs match
console.log('\n🔗 MATCHING CHECK:');
if (activeLanes && cityChoices) {
  const activeLaneIds = new Set(activeLanes.map(l => l.id));
  const choiceLaneIds = new Set(cityChoices.map(c => c.lane_id));
  
  console.log('Active lane IDs:', Array.from(activeLaneIds));
  console.log('Choice lane IDs:', Array.from(choiceLaneIds));
  
  const matches = Array.from(activeLaneIds).filter(id => choiceLaneIds.has(id));
  console.log(`\n✅ ${matches.length} active lanes have saved city choices`);
  console.log('Matching IDs:', matches);
}

process.exit(0);
