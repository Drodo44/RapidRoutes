// tests/setup/mock-here-api.js
import { vi } from 'vitest';

// More comprehensive mock responses
export const mockHereResponses = {
  routing: {
    routes: [{
      sections: [{
        summary: {
          length: 75000,
          duration: 3600,
          baseDuration: 3600,
          trafficTime: 4200
        },
        transport: {
          mode: "truck"
        }
      }]
    }]
  },
  geocoding: {
    items: [{
      position: {
        lat: 41.8781,
        lng: -87.6298
      },
      address: {
        label: "Chicago, IL, USA",
        city: "Chicago",
        state: "IL",
        postalCode: "60601",
        countryCode: "USA"
      }
    }]
  },
  traffic: {
    results: [{
      currentSpeed: 55,
      freeFlowSpeed: 65,
      jamFactor: 0.4,
      confidence: 0.9
    }]
  }
};

// Error response for invalid API key
const unauthorizedResponse = {
  ok: false,
  status: 401,
  json: () => Promise.resolve({
    error: 'Unauthorized',
    error_description: 'Invalid API key'
  })
};

// Enhanced mock API implementations
export const mockHereApi = {
  // Mock fetch for browser-based calls
  fetch: vi.fn((url) => {
    // Check if API key is invalid
    if (process.env.HERE_API_KEY === 'invalid') {
      return Promise.resolve(unauthorizedResponse);
    }

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
  }),

  // Mock axios responses
  axiosResponse: {
    routing: {
      status: 200,
      data: mockHereResponses.routing
    },
    geocoding: {
      status: 200,
      data: mockHereResponses.geocoding
    },
    traffic: {
      status: 200,
      data: mockHereResponses.traffic
    }
  }
};

// Mock axios for HERE API calls
vi.mock('axios', () => ({
  default: {
    get: vi.fn((url) => {
      // Check if API key is invalid
      if (process.env.HERE_API_KEY === 'invalid') {
        return Promise.reject({ 
          response: {
            status: 401,
            data: {
              error: 'Unauthorized',
              error_description: 'Invalid API key'
            }
          }
        });
      }

      if (url.includes('route')) return Promise.resolve(mockHereApi.axiosResponse.routing);
      if (url.includes('geocode')) return Promise.resolve(mockHereApi.axiosResponse.geocoding);
      if (url.includes('traffic')) return Promise.resolve(mockHereApi.axiosResponse.traffic);
      return Promise.resolve({ status: 200, data: {} });
    }),
    create: vi.fn(() => ({
      get: vi.fn((url) => {
        // Check if API key is invalid
        if (process.env.HERE_API_KEY === 'invalid') {
          return Promise.reject({ 
            response: {
              status: 401,
              data: {
                error: 'Unauthorized',
                error_description: 'Invalid API key'
              }
            }
          });
        }

        if (url.includes('route')) return Promise.resolve(mockHereApi.axiosResponse.routing);
        if (url.includes('geocode')) return Promise.resolve(mockHereApi.axiosResponse.geocoding);
        if (url.includes('traffic')) return Promise.resolve(mockHereApi.axiosResponse.traffic);
        return Promise.resolve({ status: 200, data: {} });
      })
    }))
  }
}));
