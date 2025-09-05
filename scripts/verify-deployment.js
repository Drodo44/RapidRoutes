// scripts/verify-deployment.js
import { createClient } from '@supabase/supabase-js';
import { rrNumberSystem } from '../lib/RRNumberSystem.js';
import { recapSystem } from '../lib/RecapSystem.js';

const supabaseUrl = 'https://gwuhjxomavulwduhvgvi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDeployment() {
    console.log('🔍 Starting deployment verification...');
    
    try {
        // 1. Create test lane
        console.log('\nCreating test lane...');
        const { data: lane, error: laneError } = await supabase
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

        if (laneError) throw laneError;
        console.log('✅ Test lane created');

        // 2. Test RR number generation
        console.log('\nTesting RR number generation...');
        const rrNumber = await rrNumberSystem.generateNewRRNumber();
        if (!rrNumber.match(/^RR\d{5}$/)) {
            throw new Error(`Invalid RR number format: ${rrNumber}`);
        }
        console.log('✅ RR number generated:', rrNumber);

        // 3. Test RR number association
        console.log('\nTesting RR number association...');
        await rrNumberSystem.associateWithLane(rrNumber, lane.id);
        const lookupResult = await rrNumberSystem.lookupByRRNumber(rrNumber);
        if (!lookupResult || lookupResult.id !== lane.id) {
            throw new Error('RR number association failed');
        }
        console.log('✅ RR number associated with lane');

        // 4. Test recap generation
        console.log('\nTesting recap generation...');
        const recap = await recapSystem.generateRecap(lane.id);
        if (!recap.insights || !Array.isArray(recap.insights)) {
            throw new Error('Invalid recap insights');
        }
        console.log('✅ Recap generated with insights');

        // 5. Test CSV export
        console.log('\nTesting CSV export...');
        const csv = await recapSystem.exportRecapCSV(lane.id);
        if (!csv.includes('RR Number') || !csv.includes(rrNumber)) {
            throw new Error('CSV export missing RR number');
        }
        console.log('✅ CSV export contains RR number');

        // 6. Cleanup
        console.log('\nCleaning up test data...');
        await supabase
            .from('lanes')
            .delete()
            .eq('id', lane.id);
        console.log('✅ Test data cleaned up');

        console.log('\n🎉 Deployment verification SUCCESSFUL!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Deployment verification FAILED:', error);
        process.exit(1);
    }
}

verifyDeployment();
