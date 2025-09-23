// test-local-api.js
// A simple test script to run the KMA lookup API locally

// Import the handler function
import handler from './pages/api/kma-lookup.js';

// Mock request object
const req = {
  method: 'POST',
  body: {
    lane_id: "61f287f5-278a-4277-b3fe-9055aad1fec8",
    origin_city: "Riegelwood",
    origin_state: "NC",
    destination_city: "Massillon",
    destination_state: "OH",
    equipment_code: "V"
  }
};

// Mock response object
const res = {
  status: (code) => {
    console.log(`Response status: ${code}`);
    return res;
  },
  json: (data) => {
    console.log('Response data:', JSON.stringify(data, null, 2));
    return res;
  }
};

// Call the handler function
console.log('Testing KMA lookup API locally...');
handler(req, res)
  .then(() => console.log('Handler completed'))
  .catch(err => console.error('Handler error:', err));