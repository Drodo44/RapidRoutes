import { vi, beforeEach, afterEach } from 'vitest';
import { mockSupabase, resetTestState } from './mock-supabase.js';
import { mockHereApi, mockHereResponses } from './mock-here-api.js';

// Mock Supabase
vi.mock('../../utils/supabaseClient.js', () => ({
  adminSupabase: mockSupabase
}));

// Common test setup
beforeEach(() => {
  // Reset test DB state
  resetTestState();
  
  // Clear all mocks
  vi.clearAllMocks();
  
  // Set up environment variables
  process.env.NODE_ENV = 'test';
  process.env.HERE_API_KEY = 'test-api-key-for-here';
  process.env.HERE_APP_ID = 'test-app-id';
  process.env.HERE_APP_CODE = 'test-app-code';
  
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
