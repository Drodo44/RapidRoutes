// test-isolated-row-generation.js
// Isolated test for generateDatCsvRows that bypasses Supabase entirely
// Uses mocked intelligence pairs to test row generation logic

// Set up mock before importing generateDatCsvRows
const mockIntelligentPairs = [
  {
    pickup: {
      city: 'Atlanta',
      state: 'GA',
      zip: '30309',
      kma_code: 'ATL',
      latitude: 33.7490,
      longitude: -84.3880
    },
    delivery: {
      city: 'Charlotte',
      state: 'NC', 
      zip: '28202',
      kma_code: 'CLT',
      latitude: 35.2271,
      longitude: -80.8431
    }
  },
  {
    pickup: {
      city: 'Marietta',
      state: 'GA',
      zip: '30060',
      kma_code: 'ATL',
      latitude: 33.9526,
      longitude: -84.5499
    },
    delivery: {
      city: 'Concord',
      state: 'NC',
      zip: '28025', 
      kma_code: 'CLT',
      latitude: 35.4088,
      longitude: -80.5792
    }
  },
  {
    pickup: {
      city: 'Decatur',
      state: 'GA',
      zip: '30030',
      kma_code: 'ATL',
      latitude: 33.7748,
      longitude: -84.2963
    },
    delivery: {
      city: 'Gastonia',
      state: 'NC',
      zip: '28052',
      kma_code: 'CLT', 
      latitude: 35.2621,
      longitude: -81.1873
    }
  },
  {
    pickup: {
      city: 'Roswell',
      state: 'GA',
      zip: '30075',
      kma_code: 'ATL',
      latitude: 34.0232,
      longitude: -84.3616
    },
    delivery: {
      city: 'Huntersville',
      state: 'NC',
      zip: '28078',
      kma_code: 'CLT',
      latitude: 35.4107,
      longitude: -80.8428
    }
  },
  {
    pickup: {
      city: 'Sandy Springs',
      state: 'GA',
      zip: '30328',
      kma_code: 'ATL',
      latitude: 33.9304,
      longitude: -84.3733
    },
    delivery: {
      city: 'Matthews',
      state: 'NC',
      zip: '28105',
      kma_code: 'CLT',
      latitude: 35.1168,
      longitude: -80.7234
    }
  },
  {
    pickup: {
      city: 'Alpharetta',
      state: 'GA',
      zip: '30022',
      kma_code: 'ATL',
      latitude: 34.0754,
      longitude: -84.2941
    },
    delivery: {
      city: 'Mint Hill',
      state: 'NC',
      zip: '28227',
      kma_code: 'CLT',
      latitude: 35.1796,
      longitude: -80.6534
    }
  },
  // Additional pairs with different KMAs for diversity
  {
    pickup: {
      city: 'Duluth',
      state: 'GA',
      zip: '30096',
      kma_code: 'GAI',  // Different KMA
      latitude: 34.0029,
      longitude: -84.1447
    },
    delivery: {
      city: 'Hickory',
      state: 'NC',
      zip: '28601',
      kma_code: 'HKY',  // Different KMA
      latitude: 35.7344,
      longitude: -81.3412
    }
  },
  // More diverse KMAs to test expanded radius functionality
  {
    pickup: {
      city: 'Columbus',
      state: 'GA',
      zip: '31901',
      kma_code: 'CSG',  // Columbus KMA
      latitude: 32.4610,
      longitude: -84.9877
    },
    delivery: {
      city: 'Greensboro',
      state: 'NC',
      zip: '27401',
      kma_code: 'GSO',  // Greensboro KMA
      latitude: 36.0726,
      longitude: -79.7920
    }
  },
  {
    pickup: {
      city: 'Augusta',
      state: 'GA',
      zip: '30901',
      kma_code: 'AGS',  // Augusta KMA
      latitude: 33.4735,
      longitude: -82.0105
    },
    delivery: {
      city: 'Asheville',
      state: 'NC',
      zip: '28801',
      kma_code: 'AVL',  // Asheville KMA
      latitude: 35.5951,
      longitude: -82.5515
    }
  }
];

// Mock the intelligentCache module
const mockIntelligentCache = {
  getIntelligentPairs: async (origin, destination, equipment, laneId) => {
    console.log(`[MOCK-INTELLIGENCE] Called with origin: ${origin.city}, ${origin.state}, dest: ${destination.city}, ${destination.state}, equipment: ${equipment}`);
    return {
      pairs: mockIntelligentPairs,
      cached: false,
      source: 'mock_test',
      success: true
    };
  }
};

// Set up the global mock before importing
globalThis.__MOCK_INTELLIGENT_CACHE = mockIntelligentCache;

// Now import generateDatCsvRows
import { generateDatCsvRows } from './lib/datCsvBuilder.js';

// Test lanes that previously failed
const testLanes = [
  {
    id: 'test-lane-001',
    origin_city: 'Atlanta',
    origin_state: 'GA',
    origin_zip: '30309',
    dest_city: 'Charlotte',
    dest_state: 'NC',
    dest_zip: '28202',
    equipment_code: 'V',
    weight_lbs: 45000,
    randomize_weight: false,
    length_ft: 53,
    full_partial: 'full',
    pickup_earliest: '09/15/2025',
    pickup_latest: '09/16/2025',
    comment: 'Test lane 1',
    commodity: 'General freight',
    status: 'pending'
  },
  {
    id: 'test-lane-002',
    origin_city: 'Miami',
    origin_state: 'FL',
    origin_zip: '33101',
    dest_city: 'Tampa',
    dest_state: 'FL',
    dest_zip: '33602',
    equipment_code: 'R',
    weight_lbs: 40000,
    randomize_weight: true,
    weight_min: 35000,
    weight_max: 43000,
    length_ft: 53,
    full_partial: 'full',
    pickup_earliest: '09/16/2025',
    pickup_latest: '09/17/2025',
    comment: 'Test lane 2',
    commodity: 'Refrigerated goods',
    status: 'pending'
  },
  {
    id: 'test-lane-003',
    origin_city: 'Houston',
    origin_state: 'TX',
    origin_zip: '77001',
    dest_city: 'Dallas',
    dest_state: 'TX',
    dest_zip: '75201',
    equipment_code: 'FD',
    weight_lbs: 47000,
    randomize_weight: false,
    length_ft: 48,
    full_partial: 'partial',
    pickup_earliest: '09/17/2025',
    pickup_latest: '09/18/2025',
    comment: 'Test lane 3',
    commodity: 'Steel',
    status: 'pending'
  }
];

async function testIsolatedRowGeneration() {
  console.log('=== ISOLATED ROW GENERATION TEST ===');
  console.log('Bypassing Supabase and using mocked intelligence pairs\n');

  for (const lane of testLanes) {
    console.log(`\n--- Testing Lane ${lane.id} ---`);
    console.log(`Route: ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`);
    console.log(`Equipment: ${lane.equipment_code}, Weight: ${lane.weight_lbs}${lane.randomize_weight ? ` (${lane.weight_min}-${lane.weight_max})` : ''}`);
    
    try {
      const rows = await generateDatCsvRows(lane);
      
      console.log(`[SUCCESS] Generated ${rows.length} CSV rows for lane ${lane.id}`);
      
      if (rows.length > 0) {
        console.log('Sample row structure:');
        const sampleRow = rows[0];
        const importantFields = [
          'Pickup Earliest*',
          'Pickup Latest', 
          'Weight (lbs)*',
          'Equipment*',
          'Contact Method*',
          'Origin City*',
          'Origin State*',
          'Destination City*',
          'Destination State*',
          'Reference ID'
        ];
        
        importantFields.forEach(field => {
          console.log(`  ${field}: ${sampleRow[field]}`);
        });
        
        // Validate row structure
        const missingFields = importantFields.filter(field => !sampleRow[field]);
        if (missingFields.length > 0) {
          console.log(`[WARNING] Missing fields in row: ${missingFields.join(', ')}`);
        } else {
          console.log('[VALIDATION] All required fields present in row');
        }
      }
      
    } catch (error) {
      console.log(`[ERROR] Lane ${lane.id} failed:`, error.message);
      if (error.details) {
        console.log('Error details:', JSON.stringify(error.details, null, 2));
      }
    }
  }
}

await testIsolatedRowGeneration();