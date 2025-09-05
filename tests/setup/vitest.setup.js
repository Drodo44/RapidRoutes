import { vi, beforeEach } from 'vitest';
import { mockSupabase, resetTestState } from './mock-supabase.js';
import { mockHereApi, mockHereResponses } from './mock-here-api.js';

// Mock Supabase client and other dependencies
vi.mock('../../utils/supabaseClient.js', () => ({
    adminSupabase: mockSupabase,
    supabase: mockSupabase,
    supabaseUrl: 'https://gwuhjxomavulwduhvgvi.supabase.co',
    supabaseKey: 'test-key'
}));

// Mock geographic crawl module
vi.mock('../../lib/geographicCrawl.js', () => ({
    generateGeographicCrawlPairs: async ({ origin, destination }) => ({
        pairs: [
            {
                pickup: {
                    city: origin.city,
                    state: origin.state,
                    kma_code: 'CVG',
                    distance: 15
                },
                delivery: {
                    city: destination.city,
                    state: destination.state,
                    kma_code: 'CHI',
                    distance: 25
                }
            },
            {
                pickup: {
                    city: 'Covington',
                    state: 'KY',
                    kma_code: 'CVG',
                    distance: 5
                },
                delivery: {
                    city: 'Hammond',
                    state: 'IN',
                    kma_code: 'CHI',
                    distance: 45
                }
            },
            {
                pickup: {
                    city: 'Hamilton',
                    state: 'OH',
                    kma_code: 'CVG',
                    distance: 25
                },
                delivery: {
                    city: 'Skokie',
                    state: 'IL',
                    kma_code: 'CHI',
                    distance: 55
                }
            }
        ],
        kmaAnalysis: {
            required: 5,
            uniquePickupKmas: 1,
            uniqueDeliveryKmas: 1
        }
    }),
    default: {
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
                    }
                }
            ],
            kmaAnalysis: {
                required: 5,
                uniquePickupKmas: 1,
                uniqueDeliveryKmas: 1
            }
        })
    }
}));

// Common test setup
beforeEach(() => {
  // Reset test DB state
  resetTestState();
  
  // Clear all mocks
  vi.clearAllMocks();
  
  // Set up environment variables
  process.env.NODE_ENV = 'test';
  process.env.HERE_API_KEY = 'test-api-key';
  process.env.HERE_APP_ID = 'test-app-id';
  process.env.HERE_APP_CODE = 'test-app-code';
  
  // Set Supabase environment variables
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  
  // Configure HERE API mock responses
  mockHereApi.fetch.mockImplementation((url) => {
    const response = {
      ok: true,
      status: 200,
      json: () => {
        if (url.includes('route')) return Promise.resolve(mockHereResponses.routing);
        if (url.includes('geocode')) return Promise.resolve(mockHereResponses.geocoding);
        if (url.includes('traffic')) return Promise.resolve(mockHereResponses.traffic);
        return Promise.resolve({});
      }
    };
    return Promise.resolve(response);
  });
});
