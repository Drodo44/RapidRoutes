// Debug the exact database query failing in geographic crawl
import { adminSupabase } from './utils/supabaseClient.js';

async function debugGeographicCrawlFailure() {
    console.log('🔍 Debugging why geographic crawl returns 0 valid pairs...\n');
    
    // Test the exact queries from geographicCrawl.js
    const testOrigin = { city: 'Charlotte', state: 'NC' };
    const testDestination = { city: 'Atlanta', state: 'GA' };
    
    console.log('Testing origin city query...');
    const originData = await adminSupabase
        .from('cities')
        .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
        .ilike('city', testOrigin.city)
        .ilike('state_or_province', testOrigin.state)
        .not('latitude', 'is', null)
        .not('kma_code', 'is', null)
        .limit(1);
    
    console.log('Origin query result:', originData);
    
    if (originData.error) {
        console.error('❌ Origin query failed:', originData.error);
        return;
    }
    
    if (!originData.data || originData.data.length === 0) {
        console.error('❌ No origin city found in database');
        
        // Check if city exists at all
        const anyOrigin = await adminSupabase
            .from('cities')
            .select('city, state_or_province, latitude, longitude, kma_code')
            .ilike('city', testOrigin.city)
            .limit(5);
        
        console.log('Any cities matching origin name:', anyOrigin);
        return;
    }
    
    console.log('✅ Origin found:', originData.data[0]);
    
    // Test destination
    console.log('\nTesting destination city query...');
    const destinationData = await adminSupabase
        .from('cities')
        .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
        .ilike('city', testDestination.city)
        .ilike('state_or_province', testDestination.state)
        .not('latitude', 'is', null)
        .not('kma_code', 'is', null)
        .limit(1);
    
    console.log('Destination query result:', destinationData);
    
    if (destinationData.error) {
        console.error('❌ Destination query failed:', destinationData.error);
        return;
    }
    
    if (!destinationData.data || destinationData.data.length === 0) {
        console.error('❌ No destination city found in database');
        return;
    }
    
    console.log('✅ Destination found:', destinationData.data[0]);
    
    // Now test the radius query that finds nearby cities
    const baseOrigin = originData.data[0];
    const lat = baseOrigin.latitude;
    const lng = baseOrigin.longitude;
    const radiusMiles = 75;
    
    console.log(`\nTesting nearby cities query within ${radiusMiles} miles of ${baseOrigin.city}...`);
    
    // This is the critical query that might be failing
    const nearbyCities = await adminSupabase
        .rpc('find_cities_within_radius', {
            center_lat: lat,
            center_lng: lng,
            radius_miles: radiusMiles
        });
    
    console.log('Nearby cities query result:', nearbyCities);
    
    if (nearbyCities.error) {
        console.error('❌ FOUND THE PROBLEM: Nearby cities query failed:', nearbyCities.error);
        console.log('This is why geographic crawl returns 0 pairs!');
        return;
    }
    
    if (!nearbyCities.data || nearbyCities.data.length === 0) {
        console.error('❌ FOUND THE PROBLEM: No nearby cities found within 75 miles');
        console.log('Database may be missing spatial function or data');
        return;
    }
    
    console.log(`✅ Found ${nearbyCities.data.length} nearby cities`);
    console.log('First 5 nearby cities:', nearbyCities.data.slice(0, 5));
}

debugGeographicCrawlFailure();