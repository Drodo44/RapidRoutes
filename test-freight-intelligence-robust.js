// Test the Freight Intelligence System with comprehensive error handling
import FreightIntelligence from './lib/FreightIntelligence.js';
import { adminSupabase } from './utils/supabaseClient.js';

async function testFreightIntelligence() {
    console.log('🧠 Testing Freight Intelligence System');
    console.log('='.repeat(60));

    const intelligence = new FreightIntelligence();

    try {
        // Get some actual TQL lanes to test with
        const { data: lanes, error } = await adminSupabase
            .from('lanes')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10); // Test with more lanes

        if (error) throw error;

        console.log(`Testing with ${lanes.length} recent TQL lanes\n`);
        
        let successfulOperations = 0;
        const startTime = Date.now();

        for (const lane of lanes) {
            try {
                console.log(`\n📍 Processing Lane: ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`);
                console.log(`Equipment: ${lane.equipment_code}`);
                
                // First check if we already know this pair
                const existingPair = await intelligence.getCityPair(
                    lane.origin_city,
                    lane.origin_state,
                    lane.dest_city,
                    lane.dest_state
                );

                if (existingPair) {
                    console.log('✨ Found existing intelligence data!');
                    console.log(`Usage frequency: ${existingPair.usage_frequency}`);
                    console.log(`Equipment patterns:`, existingPair.equipment_patterns);
                    console.log(`Metadata:`, existingPair.metadata);
                    
                    // Update usage stats
                    const updated = await intelligence.updateUsage(
                        existingPair.city_pair_hash, 
                        lane.equipment_code
                    );

                    if (updated) {
                        console.log('Updated usage statistics');
                        successfulOperations++;
                    }
                    
                } else {
                    console.log('🆕 New city pair - gathering intelligence...');

                    // Get city details from database
                    const { data: originCity } = await adminSupabase
                        .from('cities')
                        .select('*')
                        .eq('city', lane.origin_city)
                        .eq('state_or_province', lane.origin_state)
                        .single();

                    const { data: destCity } = await adminSupabase
                        .from('cities')
                        .select('*')
                        .eq('city', lane.dest_city)
                        .eq('state_or_province', lane.dest_state)
                        .single();

                    if (!originCity || !destCity) {
                        console.error('Could not find city data');
                        continue;
                    }

                    // Find nearby cities with retries
                    console.log('\nGathering origin area intelligence...');
                    const originCities = await intelligence.findAndCacheCitiesNearby(
                        originCity.latitude,
                        originCity.longitude,
                        75
                    );
                    
                    if (originCities.length > 0) {
                        console.log(`Found ${originCities.length} nearby origin cities`);
                        originCities.forEach(city => {
                            console.log(`• ${city.city}, ${city.state} (${city.distance} miles)`);
                            if (city.county) console.log(`  County: ${city.county}`);
                        });
                    } else {
                        console.log('⚠️ No origin cities found - skipping');
                        continue;
                    }

                    console.log('\nGathering destination area intelligence...');
                    const destCities = await intelligence.findAndCacheCitiesNearby(
                        destCity.latitude,
                        destCity.longitude,
                        75
                    );
                    
                    if (destCities.length > 0) {
                        console.log(`Found ${destCities.length} nearby destination cities`);
                        destCities.forEach(city => {
                            console.log(`• ${city.city}, ${city.state} (${city.distance} miles)`);
                            if (city.county) console.log(`  County: ${city.county}`);
                        });
                    } else {
                        console.log('⚠️ No destination cities found - skipping');
                        continue;
                    }

                    // Store the intelligence
                    const storedPair = await intelligence.storeCityPair(
                        lane.origin_city,
                        lane.origin_state,
                        lane.dest_city,
                        lane.dest_state,
                        originCities,
                        destCities,
                        lane.equipment_code
                    );

                    if (storedPair) {
                        console.log('✅ Successfully stored new intelligence data');
                        console.log(`Total potential city pairs: ${storedPair.metadata.potential_pairs}`);
                        console.log(`States covered: ${storedPair.metadata.origin_states.join(', ')} → ${storedPair.metadata.dest_states.join(', ')}`);
                        successfulOperations++;
                    }
                }

            } catch (error) {
                console.error(`Error processing lane: ${error.message}`);
                continue; // Continue with next lane even if one fails
            }
        }

        // Print statistics
        const stats = intelligence.getStats();
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        
        console.log('\n📊 Intelligence System Statistics');
        console.log('='.repeat(40));
        console.log(`Total operations attempted: ${lanes.length}`);
        console.log(`Successful operations: ${successfulOperations}`);
        console.log(`Success rate: ${((successfulOperations/lanes.length) * 100).toFixed(1)}%`);
        console.log(`API calls made: ${stats.apiCalls}`);
        console.log(`Cache hits: ${stats.cacheHits}`);
        console.log(`Cache hit rate: ${stats.cacheHitRate}`);
        console.log(`Total processing time: ${duration}s`);

    } catch (error) {
        console.error('Error testing freight intelligence:', error);
    }
}

// Run the test
testFreightIntelligence().catch(console.error);
