// 🔧 INTELLIGENCE SYSTEM INPUT STRUCTURE FIX TEST
// Testing with correct data structure expected by FreightIntelligence

import dotenv from 'dotenv';
dotenv.config();

import { FreightIntelligence } from './lib/FreightIntelligence.js';

async function testWithCorrectStructure() {
    console.log('🔧 TESTING WITH CORRECT INPUT STRUCTURE');
    
    const intelligence = new FreightIntelligence();
    
    // Test with correctly structured input
    const correctInput = {
        origin: { 
            city: "Cincinnati", 
            state: "OH" 
        },
        destination: { 
            city: "Philadelphia", 
            state: "PA" 
        },
        equipment: "FD"
    };
    
    console.log('\n📊 Correct Input Structure:');
    console.log(JSON.stringify(correctInput, null, 2));
    
    try {
        console.log('\n🚀 Calling intelligence.generateDiversePairs() with correct structure...');
        const result = await intelligence.generateDiversePairs(correctInput);
        
        console.log('\n✅ SUCCESS! Intelligence system returned result:');
        console.log('Result type:', typeof result);
        console.log('Has pairs:', result && result.hasOwnProperty('pairs'));
        console.log('Pairs count:', result?.pairs?.length || 0);
        
        if (result?.pairs?.length > 0) {
            console.log('\n🎯 INTELLIGENCE SYSTEM IS WORKING!');
            console.log('Sample pair:', JSON.stringify(result.pairs[0], null, 2));
        }
        
        return result;
        
    } catch (error) {
        console.log('\n❌ Still failing with correct structure:');
        console.log('Error:', error.message);
        return { error: error.message };
    }
}

// Run the corrected test
if (process.argv[1] === new URL(import.meta.url).pathname) {
    testWithCorrectStructure().catch(console.error);
}