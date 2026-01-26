// local-kma-test.js
// Test the KMA lookup API locally

import http from 'http';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import kmaLookupHandler from './pages/api/kma-lookup.js';

// Create a mock req and res
const mockReq = {
  method: 'POST',
  headers: {
    'content-type': 'application/json'
  },
  body: {
    lane_id: "61f287f5-278a-4277-b3fe-9055aad1fec8",
    origin_city: "Riegelwood",
    origin_state: "NC",
    destination_city: "Massillon",
    destination_state: "OH",
    equipment_code: "V"
  }
};

const mockRes = {
  status: (code) => {
    console.log(`Status Code: ${code}`);
    return mockRes;
  },
  json: (data) => {
    console.log('Response Data:', JSON.stringify(data, null, 2));
    return mockRes;
  },
  end: () => {
    console.log('Response ended');
    return mockRes;
  }
};

// Run the handler
console.log('Testing KMA lookup API handler locally...');
handler(mockReq, mockRes);