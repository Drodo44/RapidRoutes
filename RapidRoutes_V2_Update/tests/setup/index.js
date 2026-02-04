// tests/setup/index.js
import { vi } from 'vitest';
import { mockData, mockSupabaseClient } from '../mocks/supabase-client.js';

// Test configuration
export const TEST_CONFIG = {
    supabaseUrl: 'https://test.supabase.co',
    supabaseKey: 'test-key'
};

// Mock geographic crawl system
export const mockGeographicCrawl = {
    generateGeographicCrawlPairs: async ({ origin, destination }) => ({
        pairs: [
            {
                pickup: {
                    city: origin.city,
                    state: origin.state,
                    kma_code: 'CHI',
                    distance: 15
                },
                delivery: {
                    city: destination.city,
                    state: destination.state,
                    kma_code: 'ATL',
                    distance: 25
                },
                distances: {
                    pickup: 15,
                    delivery: 25
                }
            },
            {
                pickup: {
                    city: 'Milwaukee',
                    state: 'WI',
                    kma_code: 'MKE',
                    distance: 35
                },
                delivery: {
                    city: 'Macon',
                    state: 'GA',
                    kma_code: 'MAC',
                    distance: 45
                },
                distances: {
                    pickup: 35,
                    delivery: 45
                }
            },
            {
                pickup: {
                    city: 'Oak Park',
                    state: 'IL',
                    kma_code: 'CHI',
                    distance: 10
                },
                delivery: {
                    city: 'Hammond',
                    state: 'IN',
                    kma_code: 'IND',
                    distance: 30
                },
                distances: {
                    pickup: 10,
                    delivery: 30
                }
            },
            {
                pickup: {
                    city: 'Hammond',
                    state: 'IN',
                    kma_code: 'IND',
                    distance: 20
                },
                delivery: {
                    city: 'Oak Park',
                    state: 'IL',
                    kma_code: 'CHI',
                    distance: 40
                },
                distances: {
                    pickup: 20,
                    delivery: 40
                }
            },
            {
                pickup: {
                    city: 'Chicago',
                    state: 'IL',
                    kma_code: 'CHI',
                    distance: 0
                },
                delivery: {
                    city: 'Atlanta',
                    state: 'GA',
                    kma_code: 'ATL',
                    distance: 0
                },
                distances: {
                    pickup: 0,
                    delivery: 0
                }
            },
            {
                pickup: {
                    city: 'Milwaukee',
                    state: 'WI',
                    kma_code: 'MKE',
                    distance: 35
                },
                delivery: {
                    city: 'Hammond',
                    state: 'IN',
                    kma_code: 'IND',
                    distance: 45
                },
                distances: {
                    pickup: 35,
                    delivery: 45
                }
            }
        ],
        kmaAnalysis: {
            required: 5,
            uniquePickupKmas: 3,
            uniqueDeliveryKmas: 3
        }
    })
};

// Set up mocks
vi.mock('@supabase/supabase-js', () => ({
    createClient: () => mockSupabaseClient
}));

vi.mock('../../lib/geographicCrawl.js', () => ({
    generateGeographicCrawlPairs: mockGeographicCrawl.generateGeographicCrawlPairs
}));

// Test data utilities
export const TEST_CITIES = {
    CHICAGO: {
        city: 'Chicago',
        state: 'IL',
        latitude: 41.8781,
        longitude: -87.6298,
        kma_code: 'CHI'
    },
    ATLANTA: {
        city: 'Atlanta',
        state: 'GA',
        latitude: 33.7490,
        longitude: -84.3880,
        kma_code: 'ATL'
    }
};

// Test assertions
export function expectValidRRNumber(rrNumber) {
    expect(rrNumber).toBeDefined();
    expect(rrNumber).toMatch(/^RR\d{5}$/);
}

export function expectValidLane(lane) {
    expect(lane).toBeDefined();
    expect(lane.origin_city).toBeDefined();
    expect(lane.origin_state).toBeDefined();
    expect(lane.dest_city).toBeDefined();
    expect(lane.dest_state).toBeDefined();
}

// Export mockData for test usage
export { mockData, mockSupabaseClient };
