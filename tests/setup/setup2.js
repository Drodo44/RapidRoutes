import { vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { resetMockData } from '../mocks/supabase-client.js';
import { mockSupabaseClient } from '../mocks/supabase-client.js';

// Test configuration
export const TEST_CONFIG = {
    supabaseUrl: 'https://test.supabase.co',
    supabaseKey: 'test-key'
};

// Mock intelligence system
export const mockIntelligence = {
    generateDiversePairs: vi.fn().mockImplementation(async ({ origin, destination, equipment }) => ({
        pairs: [
            {
                pickup: {
                    city: origin.city,
                    state: origin.state,
                    kma_code: origin.kma_code,
                    distance: 0
                },
                delivery: {
                    city: destination.city,
                    state: destination.state,
                    kma_code: destination.kma_code,
                    distance: 0
                },
                distances: {
                    pickup: 0,
                    delivery: 0
                }
            },
            {
                pickup: {
                    city: 'Cicero',
                    state: 'IL',
                    kma_code: 'CHI',
                    distance: 10
                },
                delivery: {
                    city: 'Macon',
                    state: 'GA',
                    kma_code: 'MAC',
                    distance: 60
                },
                distances: {
                    pickup: 10,
                    delivery: 60
                }
            },
            {
                pickup: {
                    city: 'Evanston',
                    state: 'IL',
                    kma_code: 'EVA',
                    distance: 12
                },
                delivery: {
                    city: 'Marietta',
                    state: 'GA',
                    kma_code: 'MAR',
                    distance: 45
                },
                distances: {
                    pickup: 12,
                    delivery: 45
                }
            },
            {
                pickup: {
                    city: 'Hammond',
                    state: 'IN',
                    kma_code: 'HAM',
                    distance: 25
                },
                delivery: {
                    city: 'Roswell',
                    state: 'GA',
                    kma_code: 'ROS',
                    distance: 35
                },
                distances: {
                    pickup: 25,
                    delivery: 35
                }
            },
            {
                pickup: {
                    city: 'Gary',
                    state: 'IN',
                    kma_code: 'GAR',
                    distance: 30
                },
                delivery: {
                    city: 'Alpharetta',
                    state: 'GA',
                    kma_code: 'ALP',
                    distance: 40
                },
                distances: {
                    pickup: 30,
                    delivery: 40
                }
            },
            {
                pickup: {
                    city: 'Oak Park',
                    state: 'IL',
                    kma_code: 'OAK',
                    distance: 8
                },
                delivery: {
                    city: 'Decatur',
                    state: 'GA',
                    kma_code: 'DEC',
                    distance: 50
                },
                distances: {
                    pickup: 8,
                    delivery: 50
                }
            }
        ],
        kmaAnalysis: {
            required: 5,
            uniquePickupKmas: 6,
            uniqueDeliveryKmas: 6
        }
    }))
};

// Test utilities
export function setupTestEnv() {
    beforeAll(() => {
        // Any global setup before all tests
        process.env.NEXT_PUBLIC_SUPABASE_URL = TEST_CONFIG.supabaseUrl;
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = TEST_CONFIG.supabaseKey;
    });

    afterAll(() => {
        // Global cleanup after all tests
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    });

    beforeEach(() => {
        // Reset mocks and data before each test
        vi.clearAllMocks();
        resetMockData();
    });
}

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

// Custom test assertions
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

// Export Supabase client mock for direct use in tests
export { mockSupabaseClient };
