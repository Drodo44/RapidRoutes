// pages/api/fix-elkwood.js
// One-time fix to update Elkwood, VA lanes with correct coordinates
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Correct coordinates for Elkwood, VA
    const ELKWOOD_COORDS = {
      city: 'Elkwood',
      state: 'VA',
      zip: '22718',
      latitude: 38.5124,
      longitude: -77.8549,
      kma_code: 'VA_ALE'  // Alexandria Market
    };

    console.log('🔍 Searching for lanes with Bellwood or Elkwood as destination...');

    // Find all lanes with Bellwood/Elkwood, VA as destination
    const { data: lanes, error: searchError } = await supabaseAdmin
      .from('lanes')
      .select('*')
      .or('dest_city.ilike.%bellwood%,dest_city.ilike.%elkwood%,destination_city.ilike.%bellwood%,destination_city.ilike.%elkwood%')
      .in('dest_state', ['VA'])
      .order('created_at', { ascending: false });

    if (searchError) {
      console.error('❌ Search error:', searchError);
      return res.status(500).json({ error: searchError.message });
    }

    // Also check destination_state field variant
    const { data: lanes2 } = await supabaseAdmin
      .from('lanes')
      .select('*')
      .or('dest_city.ilike.%bellwood%,dest_city.ilike.%elkwood%,destination_city.ilike.%bellwood%,destination_city.ilike.%elkwood%')
      .in('destination_state', ['VA'])
      .order('created_at', { ascending: false });

    const allLanes = [...(lanes || []), ...(lanes2 || [])];
    
    // Remove duplicates by id
    const uniqueLanes = Array.from(new Map(allLanes.map(l => [l.id, l])).values());

    if (uniqueLanes.length === 0) {
      return res.status(200).json({ 
        message: 'No lanes found to fix',
        fixed: 0
      });
    }

    console.log(`✅ Found ${uniqueLanes.length} lane(s) to check`);

    const results = [];
    let fixedCount = 0;

    for (const lane of uniqueLanes) {
      const destCity = lane.dest_city || lane.destination_city;
      const destState = lane.dest_state || lane.destination_state;
      const currentLat = lane.dest_latitude;
      const currentLon = lane.dest_longitude;
      
      const laneInfo = {
        id: lane.id,
        route: `${lane.origin_city}, ${lane.origin_state} → ${destCity}, ${destState}`,
        currentCoords: { lat: currentLat, lon: currentLon }
      };
      
      // Check if coordinates are wrong (not in Virginia)
      const isWrongCoords = !currentLat || !currentLon || 
                            currentLat < 36.5 || currentLat > 39.5 ||  // VA latitude range
                            currentLon > -75 || currentLon < -83.5;    // VA longitude range
      
      if (isWrongCoords) {
        console.log(`⚠️  Lane ${lane.id}: WRONG COORDINATES (not in Virginia)!`);
        console.log(`   Updating to correct Elkwood, VA coords: ${ELKWOOD_COORDS.latitude}, ${ELKWOOD_COORDS.longitude}`);
        
        // Update the lane with correct coordinates and city name
        const { error: updateError } = await supabaseAdmin
          .from('lanes')
          .update({
            dest_city: ELKWOOD_COORDS.city,
            destination_city: ELKWOOD_COORDS.city,
            dest_state: ELKWOOD_COORDS.state,
            destination_state: ELKWOOD_COORDS.state,
            dest_latitude: ELKWOOD_COORDS.latitude,
            dest_longitude: ELKWOOD_COORDS.longitude,
            dest_zip: ELKWOOD_COORDS.zip
          })
          .eq('id', lane.id);
        
        if (updateError) {
          console.error(`❌ Update failed:`, updateError);
          laneInfo.status = 'error';
          laneInfo.error = updateError.message;
        } else {
          console.log(`✅ Successfully updated!`);
          laneInfo.status = 'fixed';
          laneInfo.newCoords = { lat: ELKWOOD_COORDS.latitude, lon: ELKWOOD_COORDS.longitude };
          fixedCount++;
        }
      } else {
        console.log(`✅ Lane ${lane.id}: Coordinates already correct`);
        laneInfo.status = 'already_correct';
      }
      
      results.push(laneInfo);
    }

    return res.status(200).json({
      message: `Fixed ${fixedCount} out of ${uniqueLanes.length} lanes`,
      fixed: fixedCount,
      total: uniqueLanes.length,
      lanes: results
    });

  } catch (error) {
    console.error('Fix Elkwood error:', error);
    return res.status(500).json({ error: error.message });
  }
}
