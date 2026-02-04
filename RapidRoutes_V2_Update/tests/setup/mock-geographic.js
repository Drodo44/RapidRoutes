// tests/setup/mock-geographic.js
import { vi } from 'vitest';
import { MOCK_CITIES } from '../mock-data.js';

// Create mock functions
export const generateGeographicCrawlPairs = vi.fn(async ({ origin, destination, equipment, preferFillTo10 = true }) => {
    return {
        pairs: [
            {
                pickup: {
                    ...MOCK_CITIES[0],
                    city: origin.city,
                    state: origin.state,
                    distance_miles: 25,
                    kma_code: 'CHI'
                },
                delivery: {
                    ...MOCK_CITIES[1],
                    city: destination.city,
                    state: destination.state,
                    distance_miles: 35,
                    kma_code: 'ATL'
                }
            },
            {
                pickup: {
                    ...MOCK_CITIES[2],
                    city: 'Milwaukee',
                    state: 'WI',
                    distance_miles: 45,
                    kma_code: 'MKE'
                },
                delivery: {
                    ...MOCK_CITIES[3],
                    city: 'Macon',
                    state: 'GA',
                    distance_miles: 55,
                    kma_code: 'MAC'
                }
            }
        ],
        kmaAnalysis: {
            required: 5,
            uniquePickupKmas: 2,
            uniqueDeliveryKmas: 2
        }
    };
});

export const mockGeographicCrawl = {
  findNearbyCities: vi.fn(async ({ city, state, range_miles = 75 }) => {
    // Mock implementation that returns a subset of mock cities
    return MOCK_CITIES.slice(0, 5).map(c => ({
      ...c,
      distance_miles: Math.floor(Math.random() * range_miles)
    }));
  }),
  
  getGeographicRegions: vi.fn(async (city, state) => {
    // Return mock regions
    return {
      kma_code: 'CHI',
      kma_name: 'Chicago Metro',
      state_region: 'Midwest',
      economic_region: 'Great Lakes'
    };
  }),
  
  analyzeGeographicDiversity: vi.fn(async (pairs) => {
    // Return mock diversity analysis
    return {
      unique_kmas: new Set(['CHI', 'ATL', 'DFW']).size,
      region_spread: 0.75,
      diversity_score: 0.8
    };
  }),

  generateGeographicCrawlPairs
};

// Mock the geographic crawl module
vi.mock('../../lib/geographicCrawl.js', () => {
  return {
    default: mockGeographicCrawl
  };
});
