// tests/setup/mock-here-api.js
import { vi } from 'vitest';

export const mockHereResponse = {
  "routes": [{
    "sections": [{
      "summary": {
        "length": 75000,
        "duration": 3600,
        "baseDuration": 3600
      }
    }]
  }]
};

export const mockHereApi = {
  fetch: vi.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve(mockHereResponse)
  })),
  axiosResponse: {
    status: 200,
    data: mockHereResponse
  }
};

// Mock axios for HERE API calls
vi.mock('axios', () => ({
  default: {
    get: vi.fn((url) => {
      if (url.includes('router.hereapi.com')) {
        return Promise.resolve(mockHereApi.axiosResponse);
      }
      return Promise.resolve({ status: 200, data: {} });
    }),
    create: vi.fn(() => ({
      get: vi.fn(() => Promise.resolve(mockHereApi.axiosResponse))
    }))
  }
}));

// Set up HERE API test credentials
process.env.HERE_API_KEY = 'test-api-key-for-here';
