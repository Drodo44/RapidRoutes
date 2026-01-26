// 🚨 INTELLIGENCE SYSTEM OUTPUT INSPECTION MODE
// Direct diagnostic tracing of FreightIntelligence pipeline
// NO modifications to logic - INSPECTION ONLY

import dotenv from 'dotenv';
dotenv.config();

import { FreightIntelligence } from './lib/FreightIntelligence.js';

async function inspectIntelligenceOutput(laneData) {
    console.log('\n🔍 === INTELLIGENCE SYSTEM OUTPUT INSPECTION ===');
    console.log('📊 Input Lane Data:', JSON.stringify(laneData, null, 2));
    
    try {
        console.log('\n🚀 Calling FreightIntelligence.generateDiversePairs()...');
        
        // Create intelligence instance and call directly
        const intelligence = new FreightIntelligence();
        const result = await intelligence.generateDiversePairs(laneData);
        
        console.log('\n📋 RAW INTELLIGENCE OUTPUT:');
        console.log('Full result object:', JSON.stringify(result, null, 2));
        
        // Inspect result structure
        console.log('\n🔬 RESULT STRUCTURE ANALYSIS:');
        console.log('result type:', typeof result);
        console.log('result is array:', Array.isArray(result));
        console.log('result has .pairs property:', result && result.hasOwnProperty('pairs'));
        console.log('result has .fallback property:', result && result.hasOwnProperty('fallback'));
        console.log('result has .error property:', result && result.hasOwnProperty('error'));
        
        if (result && result.pairs) {
            console.log('\n📝 PAIRS ANALYSIS:');
            console.log('pairs type:', typeof result.pairs);
            console.log('pairs is array:', Array.isArray(result.pairs));
            console.log('pairs length:', result.pairs ? result.pairs.length : 'N/A');
            
            if (result.pairs.length > 0) {
                console.log('First pair sample:', JSON.stringify(result.pairs[0], null, 2));
                
                // Analyze KMA uniqueness
                const originKMAs = result.pairs.map(p => p.origin_kma_code).filter(Boolean);
                const destKMAs = result.pairs.map(p => p.dest_kma_code).filter(Boolean);
                const uniqueOriginKMAs = [...new Set(originKMAs)];
                const uniqueDestKMAs = [...new Set(destKMAs)];
                
                console.log('\n🗺️  KMA UNIQUENESS ANALYSIS:');
                console.log('Total pairs found:', result.pairs.length);
                console.log('Origin KMAs found:', originKMAs.length);
                console.log('Unique origin KMAs:', uniqueOriginKMAs.length);
                console.log('Destination KMAs found:', destKMAs.length);
                console.log('Unique destination KMAs:', uniqueDestKMAs.length);
                console.log('Unique origin KMA codes:', uniqueOriginKMAs);
                console.log('Unique dest KMA codes:', uniqueDestKMAs);
                
                // Check if we meet minimum requirements
                const totalUniqueKMAs = Math.min(uniqueOriginKMAs.length, uniqueDestKMAs.length);
                console.log('Effective unique KMA pairs:', totalUniqueKMAs);
                console.log('Meets 6+ KMA requirement:', totalUniqueKMAs >= 6 ? '✅ YES' : '❌ NO');
            } else {
                console.log('❌ NO PAIRS GENERATED - investigating why...');
            }
        }
        
        // Check for HERE.com fallback indicators
        console.log('\n🌐 HERE.COM FALLBACK ANALYSIS:');
        if (result && result.fallback !== undefined) {
            console.log('HERE fallback property present:', result.fallback);
        } else {
            console.log('No explicit fallback property in result');
        }
        
        // Check for any error indicators
        console.log('\n⚠️  ERROR INDICATORS:');
        if (result && result.error) {
            console.log('Error in result:', result.error);
        } else {
            console.log('No error property in result');
        }
        
        return result;
        
    } catch (error) {
        console.log('\n💥 EXCEPTION CAUGHT IN INTELLIGENCE CALL:');
        console.log('Error type:', error.constructor.name);
        console.log('Error message:', error.message);
        console.log('Error stack:', error.stack);
        return { error: error.message, exception: true };
    }
}

// Test with real lane data that should work
async function runDiagnostic() {
    console.log('🚨 STARTING INTELLIGENCE SYSTEM DIAGNOSTIC');
    
    // Test Case 1: High-density corridor (should work)
    const testLane1 = {
        origin_city: 'Cincinnati',
        origin_state: 'OH',
        origin_zip: '45202',
        dest_city: 'Philadelphia', 
        dest_state: 'PA',
        dest_zip: '19102',
        equipment_code: 'FD',
        length_ft: 48,
        weight_lbs: 45000,
        full_partial: 'F',
        pickup_earliest: '2025-09-15',
        pickup_latest: '2025-09-17',
        commodity: 'Steel Coils',
        comment: 'Test diagnostic lane',
        id: 'DIAG001'
    };
    
    console.log('\n📍 TEST CASE 1: High-density corridor (Cincinnati → Philadelphia)');
    const result1 = await inspectIntelligenceOutput(testLane1);
    
    // Test Case 2: Lower-density corridor
    const testLane2 = {
        origin_city: 'Billings',
        origin_state: 'MT', 
        origin_zip: '59101',
        dest_city: 'Casper',
        dest_state: 'WY',
        dest_zip: '82601',
        equipment_code: 'FD',
        length_ft: 48,
        weight_lbs: 35000,
        full_partial: 'F',
        pickup_earliest: '2025-09-15',
        pickup_latest: '2025-09-17',
        commodity: 'General Freight',
        comment: 'Test low-density diagnostic',
        id: 'DIAG002'
    };
    
    console.log('\n📍 TEST CASE 2: Lower-density corridor (Billings → Casper)');
    const result2 = await inspectIntelligenceOutput(testLane2);
    
    console.log('\n🎯 === DIAGNOSTIC SUMMARY ===');
    console.log('Test 1 (Cincinnati→Philadelphia) pairs:', result1?.pairs?.length || 0);
    console.log('Test 2 (Billings→Casper) pairs:', result2?.pairs?.length || 0);
    
    if (result1?.pairs?.length === 0 && result2?.pairs?.length === 0) {
        console.log('🚨 BOTH TESTS FAILED - Intelligence system may be broken');
    } else if (result1?.pairs?.length >= 6) {
        console.log('✅ High-density corridor working - issue may be specific lanes');
    } else if (result1?.pairs?.length > 0 && result1?.pairs?.length < 6) {
        console.log('⚠️  Intelligence generating pairs but not meeting 6+ KMA requirement');
    }
}

// Export for use in other diagnostics
export { inspectIntelligenceOutput };

// Run diagnostic if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
    runDiagnostic().catch(console.error);
}