import dotenv from 'dotenv';
dotenv.config();

import { adminSupabase } from './utils/supabaseClient.js';
import { FreightIntelligence } from './lib/FreightIntelligence.js';
import { generateDatCsvRows } from './lib/datCsvBuilder.js';

async function testProductionLanes() {
    try {
        // Use sample test lanes that match your production patterns
        const testLanes = [
            {
                id: 'test1',
                origin_city: 'Augusta',
                origin_state: 'GA',
                dest_city: 'Mount Holly',
                dest_state: 'NJ',
                equipment_code: 'V',
                weight_lbs: 44000,
                length_ft: 53,
                full_partial: 'full',
                pickup_earliest: '09/15/2025',
                pickup_latest: '09/15/2025'
            },
            {
                id: 'test2',
                origin_city: 'New Bedford',
                origin_state: 'MA',
                dest_city: 'Saint Paul',
                dest_state: 'MN',
                equipment_code: 'FD',
                weight_lbs: 48000,
                length_ft: 48,
                full_partial: 'full',
                pickup_earliest: '09/15/2025',
                pickup_latest: '09/15/2025'
            }
        ];
        
        console.log('🔍 Testing with sample lanes...');
        const lanes = testLanes;
            
        if (error) throw error;
        
        console.log(`Found ${lanes.length} lanes to test\n`);
        
        for (const lane of lanes) {
            console.log(`\n📍 Testing lane ${lane.id}: ${lane.origin_city}, ${lane.origin_state} -> ${lane.dest_city}, ${lane.dest_state}`);
            console.log(`Equipment: ${lane.equipment_code}, Weight: ${lane.weight_lbs}lbs`);
            
            try {
                const rows = await generateDatCsvRows(lane);
                console.log(`✅ Successfully generated ${rows.length} rows`);
                console.log('Sample row structure:', Object.keys(rows[0]).join(', '));
                console.log(`First row cities: ${rows[0]['Origin City*']} -> ${rows[0]['Destination City*']}`);
            } catch (laneError) {
                console.error(`❌ Failed to process lane ${lane.id}:`, laneError.message);
            }
        }
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testProductionLanes();
