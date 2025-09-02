import { FreightIntelligence } from './lib/FreightIntelligence.js';
import { generateDatCsvRows } from './lib/datCsvBuilder.js';

// Mock the monitor for testing
global.monitor = {
    log: console.log,
    startOperation: () => {},
    endOperation: () => {},
    monitorMemory: async () => {},
    logError: async (error) => console.error(error)
};

async function testLaneGeneration() {
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
    
    console.log('🔍 Testing lane generation with key TQL freight corridors...\n');
    
    for (const lane of testLanes) {
        console.log(`\n📍 Testing lane: ${lane.origin_city}, ${lane.origin_state} -> ${lane.dest_city}, ${lane.dest_state}`);
        console.log(`Equipment: ${lane.equipment_code}, Weight: ${lane.weight_lbs}lbs`);
        
        try {
            const rows = await generateDatCsvRows(lane);
            console.log(`\n✅ Successfully generated ${rows.length} rows`);
            
            // Analyze the first few rows
            const sampleRows = rows.slice(0, 4);
            sampleRows.forEach((row, i) => {
                console.log(`\nRow ${i + 1}:`);
                console.log(`Origin: ${row['Origin City*']}, ${row['Origin State*']}`);
                console.log(`Destination: ${row['Destination City*']}, ${row['Destination State*']}`);
                console.log(`Contact: ${row['Contact Method*']}`);
                console.log(`Reference ID: ${row['Reference ID']}`);
            });
            
            // Verify row count
            if (rows.length < 12) {
                console.warn(`⚠️ Warning: Only generated ${rows.length} rows, expected at least 12`);
            } else {
                console.log(`\n✨ Perfect! Generated ${rows.length} rows with proper city diversity`);
            }
            
        } catch (error) {
            console.error(`\n❌ Error processing lane:`, error);
            if (error.details) {
                console.error('Details:', JSON.stringify(error.details, null, 2));
            }
        }
    }
}

// Run the test
testLaneGeneration().catch(console.error);
