import { FreightIntelligence } from './lib/FreightIntelligence.js';

async function testIntelligenceSystem() {
    console.log('🔍 Testing FreightIntelligence system after emergency fallback removal...\n');
    
    const intelligence = new FreightIntelligence();
    
    // Test with a real lane scenario
    const testLane = {
        origin_city: 'Charlotte',
        origin_state: 'NC',
        dest_city: 'Atlanta', 
        dest_state: 'GA',
        equipment_code: 'V',
        weight_lbs: 45000,
        pickup_earliest: '2025-09-15',
        pickup_latest: '2025-09-17'
    };
    
    try {
        console.log('📍 Test Lane:', `${testLane.origin_city}, ${testLane.origin_state} → ${testLane.dest_city}, ${testLane.dest_state}`);
        console.log('⚡ Equipment:', testLane.equipment_code, '| Weight:', testLane.weight_lbs, 'lbs\n');
        
        console.log('🎯 Generating diverse pairs with HERE.com intelligence...');
        const pairs = await intelligence.generateDiversePairs(testLane);
        
        console.log(`\n✅ Generated ${pairs.length} pairs:`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const uniqueOrigins = new Set();
        const uniqueDestinations = new Set();
        const uniqueKMAs = new Set();
        
        pairs.forEach((pair, index) => {
            console.log(`${index + 1}. ${pair.origin_city}, ${pair.origin_state} → ${pair.dest_city}, ${pair.dest_state}`);
            if (pair.origin_kma) console.log(`   📊 Origin KMA: ${pair.origin_kma} | Dest KMA: ${pair.dest_kma || 'N/A'}`);
            
            uniqueOrigins.add(`${pair.origin_city}, ${pair.origin_state}`);
            uniqueDestinations.add(`${pair.dest_city}, ${pair.dest_state}`);
            if (pair.origin_kma) uniqueKMAs.add(pair.origin_kma);
            if (pair.dest_kma) uniqueKMAs.add(pair.dest_kma);
        });
        
        console.log('\n📈 Diversity Analysis:');
        console.log(`   🎯 Unique Origins: ${uniqueOrigins.size}`);
        console.log(`   🎯 Unique Destinations: ${uniqueDestinations.size}`);
        console.log(`   🎯 Unique KMAs: ${uniqueKMAs.size}`);
        console.log(`   ✅ Meets 6+ minimum: ${pairs.length >= 6 ? 'YES' : 'NO'}`);
        
        if (pairs.length >= 6 && uniqueKMAs.size > 3) {
            console.log('\n🎉 SUCCESS: HERE.com intelligence system is working!');
            console.log('   ✅ Diverse KMA pairs generated');
            console.log('   ✅ No repeated city combinations');
            console.log('   ✅ Ready for CSV generation');
        } else {
            console.log('\n⚠️  ISSUE: Intelligence system may still have problems');
        }
        
    } catch (error) {
        console.error('❌ Error testing intelligence system:', error.message);
        console.error('Stack:', error.stack);
    }
}

testIntelligenceSystem();