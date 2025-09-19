// verify-lane-generation.js
require('dotenv').config();

// Mock data for testing
const testLane = {
    id: 'test-001',
    origin_city: 'Cincinnati',
    origin_state: 'OH',
    origin_zip: '45202',
    dest_city: 'Chicago',
    dest_state: 'IL',
    dest_zip: '60601',
    equipment_code: 'V',
    length_ft: 53,
    weight_lbs: 45000,
    randomize_weight: false,
    full_partial: 'full',
    pickup_earliest: '2025-09-20',
    pickup_latest: '2025-09-21',
    status: 'pending',
    comment: 'High density corridor test',
    commodity: 'General Freight'
};

// DAT CSV headers (standard order)
const DAT_HEADERS = [
    "Pickup Earliest*", "Pickup Latest", "Length (ft)*", "Weight (lbs)*",
    "Full/Partial*", "Equipment*", "Use Private Network*", "Private Network Rate",
    "Allow Private Network Booking", "Allow Private Network Bidding",
    "Use DAT Loadboard*", "DAT Loadboard Rate", "Allow DAT Loadboard Booking",
    "Use Extended Network", "Contact Method*", "Origin City*", "Origin State*",
    "Origin Postal Code", "Destination City*", "Destination State*",
    "Destination Postal Code", "Comment", "Commodity", "Reference ID"
];

// Mock cities with KMA codes within 75 miles
const nearbyCities = {
    cincinnati: [
        { city: 'Cincinnati', state: 'OH', zip: '45202', kma_code: 'CIN' },
        { city: 'Covington', state: 'KY', zip: '41011', kma_code: 'CIN' },
        { city: 'Newport', state: 'KY', zip: '41071', kma_code: 'CIN' },
        { city: 'Hamilton', state: 'OH', zip: '45011', kma_code: 'CIN' },
        { city: 'Middletown', state: 'OH', zip: '45042', kma_code: 'DAY' },
        { city: 'Dayton', state: 'OH', zip: '45402', kma_code: 'DAY' }
    ],
    chicago: [
        { city: 'Chicago', state: 'IL', zip: '60601', kma_code: 'CHI' },
        { city: 'Gary', state: 'IN', zip: '46402', kma_code: 'CHI' },
        { city: 'Hammond', state: 'IN', zip: '46320', kma_code: 'CHI' },
        { city: 'Joliet', state: 'IL', zip: '60431', kma_code: 'CHI' },
        { city: 'Aurora', state: 'IL', zip: '60505', kma_code: 'CHI' },
        { city: 'Milwaukee', state: 'WI', zip: '53202', kma_code: 'MKE' }
    ]
};

function generateLaneRows() {
    const rows = [];
    let refIdCounter = 100001;

    // Generate rows for each origin/destination pair
    nearbyCities.cincinnati.forEach(origin => {
        nearbyCities.chicago.forEach(dest => {
            ['Email', 'Primary Phone'].forEach(contactMethod => {
                rows.push({
                    'Pickup Earliest*': testLane.pickup_earliest,
                    'Pickup Latest': testLane.pickup_latest,
                    'Length (ft)*': testLane.length_ft.toString(),
                    'Weight (lbs)*': testLane.weight_lbs.toString(),
                    'Full/Partial*': testLane.full_partial.toUpperCase() === 'FULL' ? 'Full' : 'Partial',
                    'Equipment*': testLane.equipment_code,
                    'Use Private Network*': 'No',
                    'Private Network Rate': '',
                    'Allow Private Network Booking': '',
                    'Allow Private Network Bidding': '',
                    'Use DAT Loadboard*': 'Yes',
                    'DAT Loadboard Rate': '',
                    'Allow DAT Loadboard Booking': '',
                    'Use Extended Network': '',
                    'Contact Method*': contactMethod,
                    'Origin City*': origin.city,
                    'Origin State*': origin.state,
                    'Origin Postal Code': origin.zip,
                    'Destination City*': dest.city,
                    'Destination State*': dest.state,
                    'Destination Postal Code': dest.zip,
                    'Comment': testLane.comment || '',
                    'Commodity': testLane.commodity || '',
                    'Reference ID': `RR${refIdCounter++}`,
                    'kma_code': origin.kma_code // for analysis only
                });
            });
        });
    });

    return rows;
}

function verifyLaneGeneration() {
    console.log('🔬 LANE GENERATION VERIFICATION');
    console.log('==============================\n');

    try {
        // Generate rows
        const rows = generateLaneRows();

        // Analyze results
        const uniqueOrigins = new Set(rows.map(r => `${r['Origin City*']}, ${r['Origin State*']}`));
        const uniqueDests = new Set(rows.map(r => `${r['Destination City*']}, ${r['Destination State*']}`));
        const contactMethods = new Set(rows.map(r => r['Contact Method*']));
        const uniqueKMAs = new Set(rows.map(r => r.kma_code));

        console.log('Generation Analysis:');
        console.log(`Total Rows: ${rows.length}`);
        console.log(`Unique Origins: ${uniqueOrigins.size}`);
        console.log(`Unique Destinations: ${uniqueDests.size}`);
        console.log(`Contact Methods: ${Array.from(contactMethods).join(', ')}`);
        console.log(`Unique KMAs: ${uniqueKMAs.size}`);

        // Requirements validation
        const meetsMinimumPairs = uniqueOrigins.size >= 6;
        const hasRequiredContacts = contactMethods.has('Email') && contactMethods.has('Primary Phone');
        const rowCountValid = rows.length >= uniqueOrigins.size * uniqueDests.size * 2;

        console.log('\nRequirements Check:');
        console.log(`${meetsMinimumPairs ? '✅' : '❌'} Minimum 6 pairs (${uniqueOrigins.size})`);
        console.log(`${hasRequiredContacts ? '✅' : '❌'} Contact methods complete`);
        console.log(`${rowCountValid ? '✅' : '❌'} Row count valid`);

        // Row count validation
        const expectedRows = uniqueOrigins.size * uniqueDests.size * contactMethods.size;
        console.log('\nRow Count Validation:');
        console.log(`Origins (${uniqueOrigins.size}) × Destinations (${uniqueDests.size}) × Contact Methods (${contactMethods.size})`);
        console.log(`Expected Rows: ${expectedRows}`);
        console.log(`Actual Rows: ${rows.length}`);
        
        // Sample output
        console.log('\nSample Rows:');
        rows.slice(0, 3).forEach((row, i) => {
            console.log(`\nRow ${i + 1}:`);
            console.log(`Origin: ${row['Origin City*']}, ${row['Origin State*']} (${row['Origin Postal Code']})`);
            console.log(`Destination: ${row['Destination City*']}, ${row['Destination State*']} (${row['Destination Postal Code']})`);
            console.log(`Contact: ${row['Contact Method*']}`);
            console.log(`Equipment: ${row['Equipment*']}`);
            console.log(`Weight: ${row['Weight (lbs)*']} lbs`);
            console.log(`KMA: ${row['kma_code']}`);
        });

        // KMA diversity analysis
        console.log('\nKMA Diversity:');
        const kmaCount = {};
        rows.forEach(row => {
            if (row.kma_code) {
                kmaCount[row.kma_code] = (kmaCount[row.kma_code] || 0) + 1;
            }
        });
        Object.entries(kmaCount)
            .sort((a, b) => b[1] - a[1])
            .forEach(([kma, count]) => {
                console.log(`${kma}: ${count} rows (${((count / rows.length) * 100).toFixed(1)}%)`);
            });

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

verifyLaneGeneration();