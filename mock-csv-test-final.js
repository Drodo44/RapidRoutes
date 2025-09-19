// mock-csv-test-final.js
import dotenv from 'dotenv';
dotenv.config();

import { toCsv, DAT_HEADERS } from './lib/datCsvBuilder.js';
import { normalizeDatDate } from './lib/datCsvBuilder.js';

function createMockCities(type) {
  switch (type) {
    case 'high-density':
      return [
        { city: 'Cincinnati', state: 'OH', zip: '45202', kma_code: 'CIN' },
        { city: 'Columbus', state: 'OH', zip: '43215', kma_code: 'CMH' },
        { city: 'Indianapolis', state: 'IN', zip: '46204', kma_code: 'IND' },
        { city: 'Louisville', state: 'KY', zip: '40202', kma_code: 'SDF' },
        { city: 'Dayton', state: 'OH', zip: '45402', kma_code: 'DAY' },
        { city: 'Lexington', state: 'KY', zip: '40507', kma_code: 'LEX' },
        { city: 'Chicago', state: 'IL', zip: '60601', kma_code: 'CHI' },
      ];
    case 'southeast':
      return [
        { city: 'Atlanta', state: 'GA', zip: '30303', kma_code: 'ATL' },
        { city: 'Charlotte', state: 'NC', zip: '28202', kma_code: 'CLT' },
        { city: 'Jacksonville', state: 'FL', zip: '32202', kma_code: 'JAX' },
        { city: 'Columbia', state: 'SC', zip: '29201', kma_code: 'CAE' },
        { city: 'Savannah', state: 'GA', zip: '31401', kma_code: 'SAV' },
        { city: 'Orlando', state: 'FL', zip: '32801', kma_code: 'MCO' },
        { city: 'Miami', state: 'FL', zip: '33101', kma_code: 'MIA' },
      ];
    case 'rural':
      return [
        { city: 'Rapid City', state: 'SD', zip: '57701', kma_code: 'RAP' },
        { city: 'Casper', state: 'WY', zip: '82601', kma_code: 'CPR' },
        { city: 'Billings', state: 'MT', zip: '59101', kma_code: 'BIL' },
        { city: 'Great Falls', state: 'MT', zip: '59401', kma_code: 'GTF' },
        { city: 'Bismarck', state: 'ND', zip: '58501', kma_code: 'BIS' },
        { city: 'Bozeman', state: 'MT', zip: '59715', kma_code: 'BZN' },
      ];
    default:
      throw new Error('Unknown city type');
  }
}

function createCsvRows(lane, originCities, destCities) {
  const rows = [];
  let refIdCounter = Math.floor(Math.random() * 900000) + 100000;

  // Generate rows for each city pair and contact method
  originCities.forEach(origin => {
    destCities.forEach(dest => {
      ['Email', 'Primary Phone'].forEach(contactMethod => {
        const weight = lane.randomize_weight
          ? Math.floor(Math.random() * (lane.weight_max - lane.weight_min + 1)) + lane.weight_min
          : lane.weight_lbs;

        rows.push({
          'Pickup Earliest*': normalizeDatDate(lane.pickup_earliest),
          'Pickup Latest': normalizeDatDate(lane.pickup_latest),
          'Length (ft)*': lane.length_ft.toString(),
          'Weight (lbs)*': weight.toString(),
          'Full/Partial*': lane.full_partial.toUpperCase() === 'FULL' ? 'Full' : 'Partial',
          'Equipment*': lane.equipment_code,
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
          'Comment': lane.comment || '',
          'Commodity': lane.commodity || '',
          'Reference ID': `RR${refIdCounter++}`,
          'kma_code': origin.kma_code // for analysis only
        });
      });
    });
  });

  return rows;
}

async function testLaneGeneration() {
  const testLanes = [
    {
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
    },
    {
      id: 'test-002',
      origin_city: 'Atlanta',
      origin_state: 'GA',
      origin_zip: '30303',
      dest_city: 'Miami',
      dest_state: 'FL',
      dest_zip: '33101',
      equipment_code: 'R',
      length_ft: 53,
      weight_lbs: 42000,
      randomize_weight: false,
      full_partial: 'full',
      pickup_earliest: '2025-09-20',
      pickup_latest: '2025-09-21',
      status: 'pending',
      comment: 'Southeast corridor test',
      commodity: 'Refrigerated Goods'
    },
    {
      id: 'test-003',
      origin_city: 'Rapid City',
      origin_state: 'SD',
      origin_zip: '57701',
      dest_city: 'Bozeman',
      dest_state: 'MT',
      dest_zip: '59715',
      equipment_code: 'FD',
      length_ft: 48,
      weight_lbs: 48000,
      randomize_weight: false,
      full_partial: 'full',
      pickup_earliest: '2025-09-20',
      pickup_latest: '2025-09-21',
      status: 'pending',
      comment: 'Rural corridor test',
      commodity: 'Heavy Equipment'
    }
  ];

  console.log('🔬 LANE GENERATION TEST (MOCK DATA)');
  console.log('=================================\n');

  try {
    for (const [index, testLane] of testLanes.entries()) {
      console.log(`Testing Lane ${index + 1}: ${testLane.origin_city} → ${testLane.dest_city}`);
      console.log('----------------------------------------');

      // Get appropriate city sets based on the lane
      let type = 'high-density';
      if (testLane.id === 'test-002') type = 'southeast';
      if (testLane.id === 'test-003') type = 'rural';

      const originCities = createMockCities(type);
      const destCities = createMockCities(type);

      // Generate rows
      const rows = createCsvRows(testLane, originCities, destCities);

      // Analysis
      const uniqueOrigins = new Set(rows.map(r => `${r['Origin City*']}, ${r['Origin State*']}`));
      const uniqueDests = new Set(rows.map(r => `${r['Destination City*']}, ${r['Destination State*']}`));
      const contactMethods = new Set(rows.map(r => r['Contact Method*']));
      const uniqueKMAs = new Set(rows.map(r => r.kma_code));

      console.log('\nGeneration Analysis:');
      console.log(`Total Rows: ${rows.length}`);
      console.log(`Unique Origins: ${uniqueOrigins.size}`);
      console.log(`Unique Destinations: ${uniqueDests.size}`);
      console.log(`Contact Methods: ${Array.from(contactMethods).join(', ')}`);
      console.log(`Unique KMAs: ${uniqueKMAs.size}`);

      // Requirements validation
      const meetsMinimumPairs = uniqueOrigins.size >= 6;
      const hasRequiredContacts = contactMethods.has('Email') && contactMethods.has('Primary Phone');
      const rowCountValid = rows.length >= uniqueOrigins.size * 2; // At least 2 contact methods per pair

      console.log('\nRequirements Check:');
      console.log(`${meetsMinimumPairs ? '✅' : '❌'} Minimum 6 pairs (${uniqueOrigins.size})`);
      console.log(`${hasRequiredContacts ? '✅' : '❌'} Contact methods complete`);
      console.log(`${rowCountValid ? '✅' : '❌'} Row count valid`);

      // Generate actual CSV
      const csv = toCsv(DAT_HEADERS, rows);
      const csvLines = csv.split('\n');

      console.log('\nCSV Generation:');
      console.log(`CSV Header Count: ${DAT_HEADERS.length}`);
      console.log(`CSV Data Lines: ${csvLines.length - 1}`); // -1 for header
      
      // Sample output
      console.log('\nSample Rows:');
      rows.slice(0, 3).forEach((row, i) => {
        console.log(`\nRow ${i + 1}:`);
        console.log(`Origin: ${row['Origin City*']}, ${row['Origin State*']} (${row['Origin Postal Code']})`);
        console.log(`Destination: ${row['Destination City*']}, ${row['Destination State*']} (${row['Destination Postal Code']})`);
        console.log(`Contact: ${row['Contact Method*']}`);
        console.log(`Equipment: ${row['Equipment*']}`);
        console.log(`Weight: ${row['Weight (lbs)*']} lbs`);
      });

      console.log('\n');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testLaneGeneration().catch(console.error);