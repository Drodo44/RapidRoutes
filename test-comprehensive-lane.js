// Comprehensive lane generation test
import { adminSupabase } from './utils/supabaseClient.js';
import { FreightIntelligence } from './lib/FreightIntelligence.js';
import { generateDefinitiveIntelligentPairs } from './lib/definitiveIntelligent.js';
import { validateCityCoordinates } from './lib/cityValidator.js';
import { calculateDistance } from './lib/distanceCalculator.js';

async function runComprehensiveTest() {
    console.log('🚀 Starting comprehensive lane generation test...');
    
    // 1. Get all lanes from database
    const { data: lanes, error } = await adminSupabase
        .from('lanes')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Failed to fetch lanes:', error);
        return;
    }

    console.log(`📋 Testing ${lanes.length} lanes`);
    
    const intelligence = new FreightIntelligence();
    let totalPairs = 0;
    let successfulPairs = 0;
    
    for (const lane of lanes) {
        console.log(`\n🔄 Processing lane: ${lane.origin_city}, ${lane.origin_state} ➡️ ${lane.dest_city}, ${lane.dest_state}`);
        
        // Test 1: City Validation
        console.log('1️⃣ Testing city validation...');
        const originValid = await validateCityCoordinates({
            city: lane.origin_city,
            state_or_province: lane.origin_state
        });
        const destValid = await validateCityCoordinates({
            city: lane.dest_city,
            state_or_province: lane.dest_state
        });
        
        if (!originValid || !destValid) {
            console.error('❌ City validation failed');
            continue;
        }
        console.log('✅ Cities validated successfully');
        
        // Test 2: Distance Calculation
        console.log('2️⃣ Testing distance calculation...');
        const distance = calculateDistance(
            originValid.latitude,
            originValid.longitude,
            destValid.latitude,
            destValid.longitude
        );
        console.log(`📏 Distance: ${distance} miles`);
        
        // Test 3: City Pair Generation
        console.log('3️⃣ Testing city pair generation...');
        try {
            const pairs = await generateDefinitiveIntelligentPairs({
                origin: {
                    city: lane.origin_city,
                    state: lane.origin_state,
                    ...originValid
                },
                destination: {
                    city: lane.dest_city,
                    state: lane.dest_state,
                    ...destValid
                },
                equipment: lane.equipment_code,
                preferFillTo10: true
            });
            
            totalPairs += pairs.length;
            
            // Validate each pair
            for (const pair of pairs) {
                if (pair.origin && pair.destination) {
                    successfulPairs++;
                    
                    // Test 4: Intelligence Scoring
                    const score = await intelligence.calculateFreightIntelligence(
                        pair.origin,
                        lane.equipment_code,
                        originValid
                    );
                    
                    console.log(`🎯 Intelligence score for ${pair.origin.city}, ${pair.origin.state}: ${score}`);
                }
            }
            
            console.log(`✅ Generated ${pairs.length} pairs successfully`);
            
        } catch (error) {
            console.error('❌ Pair generation failed:', error);
        }
    }
    
    // Final Report
    console.log('\n📊 FINAL TEST REPORT');
    console.log('====================');
    console.log(`Total lanes processed: ${lanes.length}`);
    console.log(`Total pairs generated: ${totalPairs}`);
    console.log(`Successful pairs: ${successfulPairs}`);
    console.log(`Success rate: ${((successfulPairs/totalPairs) * 100).toFixed(2)}%`);
    console.log(`API calls made: ${intelligence.apiCallCount}`);
    console.log(`Cache hits: ${intelligence.cacheHits}`);
}

// Run the test
runComprehensiveTest().catch(console.error);
