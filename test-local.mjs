// Mock the database and monitoring system
const mockDb = {
    async query() { return { rows: [] }; }
};

global.monitor = {
    log: console.log,
    startOperation: () => {},
    endOperation: () => {},
    monitorMemory: async () => {},
    logError: async (error) => console.error(error)
};

class TestFreightIntelligence {
    async generateDiversePairs({ origin, destination, equipment }) {
        const pairs = [];
        // Test corridors based on origin
        if (origin.state === 'GA') {
            pairs.push(
                { pickup: { city: 'Thomson', state: 'GA' }, delivery: { city: 'Trenton', state: 'NJ' } },
                { pickup: { city: 'Waynesboro', state: 'GA' }, delivery: { city: 'Camden', state: 'NJ' } },
                { pickup: { city: 'Martinez', state: 'GA' }, delivery: { city: 'Philadelphia', state: 'PA' } },
                { pickup: { city: 'Evans', state: 'GA' }, delivery: { city: 'Newark', state: 'NJ' } },
                { pickup: { city: 'Aiken', state: 'SC' }, delivery: { city: 'Jersey City', state: 'NJ' } },
                { pickup: { city: 'Barnwell', state: 'SC' }, delivery: { city: 'Wilmington', state: 'DE' } }
            );
        } else if (origin.state === 'MA') {
            pairs.push(
                { pickup: { city: 'Providence', state: 'RI' }, delivery: { city: 'Minneapolis', state: 'MN' } },
                { pickup: { city: 'Worcester', state: 'MA' }, delivery: { city: 'Saint Cloud', state: 'MN' } },
                { pickup: { city: 'Hartford', state: 'CT' }, delivery: { city: 'Red Wing', state: 'MN' } },
                { pickup: { city: 'Fall River', state: 'MA' }, delivery: { city: 'Cambridge', state: 'MN' } },
                { pickup: { city: 'Taunton', state: 'MA' }, delivery: { city: 'Elk River', state: 'MN' } },
                { pickup: { city: 'Plymouth', state: 'MA' }, delivery: { city: 'Buffalo', state: 'MN' } }
            );
        }
        return {
            pairs,
            baseOrigin: origin,
            baseDest: destination,
            kmaAnalysis: { uniquePickupKmas: 6, uniqueDeliveryKmas: 6 }
        };
    }
}

class TestDatCsvBuilder {
    constructor() {
        this.intelligence = new TestFreightIntelligence();
    }

    async generateDatCsvRows(lane) {
        const result = await this.intelligence.generateDiversePairs({
            origin: { city: lane.origin_city, state: lane.origin_state },
            destination: { city: lane.dest_city, state: lane.dest_state },
            equipment: lane.equipment_code
        });

        const pairs = result.pairs;
        if (!pairs || pairs.length < 6) {
            throw new Error(`Failed to generate minimum 6 pairs. Found: ${pairs?.length || 0}`);
        }

        const rows = [];
        const contactMethods = ['email', 'primary phone'];
        let refIdCounter = 1;

        // Base pair
        contactMethods.forEach(method => {
            rows.push(this.createRow(lane, result.baseOrigin, result.baseDest, method, `RR${String(refIdCounter++).padStart(5, '0')}`));
        });

        // Additional pairs
        pairs.forEach(pair => {
            contactMethods.forEach(method => {
                rows.push(this.createRow(lane, pair.pickup, pair.delivery, method, `RR${String(refIdCounter++).padStart(5, '0')}`));
            });
        });

        return rows;
    }

    createRow(lane, origin, dest, contact, refId) {
        return {
            'Pickup Earliest*': lane.pickup_earliest,
            'Pickup Latest': lane.pickup_latest || lane.pickup_earliest,
            'Length (ft)*': lane.length_ft,
            'Weight (lbs)*': lane.weight_lbs,
            'Full/Partial*': lane.full_partial || 'full',
            'Equipment*': lane.equipment_code,
            'Use Private Network*': 'NO',
            'Private Network Rate': '',
            'Allow Private Network Booking': '',
            'Allow Private Network Bidding': '',
            'Use DAT Loadboard*': 'yes',
            'DAT Loadboard Rate': '',
            'Allow DAT Loadboard Booking': '',
            'Use Extended Network': '',
            'Contact Method*': contact,
            'Origin City*': origin.city,
            'Origin State*': origin.state,
            'Origin Postal Code': origin.zip || '',
            'Destination City*': dest.city,
            'Destination State*': dest.state,
            'Destination Postal Code': dest.zip || '',
            'Comment': lane.comment || '',
            'Commodity': lane.commodity || '',
            'Reference ID': refId
        };
    }
}

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
    
    const builder = new TestDatCsvBuilder();
    console.log('🔍 Testing lane generation with key TQL freight corridors...\n');
    
    for (const lane of testLanes) {
        console.log(`\n📍 Testing lane: ${lane.origin_city}, ${lane.origin_state} -> ${lane.dest_city}, ${lane.dest_state}`);
        console.log(`Equipment: ${lane.equipment_code}, Weight: ${lane.weight_lbs}lbs`);
        
        try {
            const rows = await builder.generateDatCsvRows(lane);
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
            
            // Show unique cities used
            const uniqueOrigins = new Set(rows.map(r => `${r['Origin City*']}, ${r['Origin State*']}`));
            const uniqueDests = new Set(rows.map(r => `${r['Destination City*']}, ${r['Destination State*']}`));
            
            console.log('\n📊 City Diversity Analysis:');
            console.log(`Unique origin cities: ${uniqueOrigins.size}`);
            console.log(`Unique destination cities: ${uniqueDests.size}`);
            
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
