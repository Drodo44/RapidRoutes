// tests/verify-rr-system.js
import { rrNumberSystem } from '../lib/RRNumberSystem.js';

async function verifyRRSystem() {
    console.log('Verifying RR Number System...');
    
    try {
        // Test RR number generation
        const rrNumber = await rrNumberSystem.generateNewRRNumber();
        console.log(`Generated RR number: ${rrNumber}`);
        
        if (!rrNumber.match(/^RR\d{5}$/)) {
            throw new Error('Invalid RR number format');
        }
        
        // Create test lane
        const { data: lane } = await supabase
            .from('lanes')
            .insert({
                origin_city: 'Chicago',
                origin_state: 'IL',
                dest_city: 'Atlanta',
                dest_state: 'GA',
                equipment_code: 'V',
                weight_lbs: 45000
            })
            .select()
            .single();
            
        // Associate RR number with lane
        await rrNumberSystem.associateWithLane(rrNumber, lane.id);
        
        // Test lookup
        const lookupResult = await rrNumberSystem.lookupByRRNumber(rrNumber);
        if (!lookupResult || lookupResult.id !== lane.id) {
            throw new Error('RR number lookup failed');
        }
        
        console.log('✅ RR Number System verification passed');
        process.exit(0);
    } catch (error) {
        console.error('❌ RR Number System verification failed:', error);
        process.exit(1);
    }
}

verifyRRSystem();
