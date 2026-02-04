// minimal-test-server.js
import express from 'express';
import handler from './pages/api/kma-lookup.js';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json());

// Mount the handler
app.all('/api/kma-lookup', (req, res) => {
  console.log('Request received:', req.method, req.path);
  console.log('Body:', req.body);
  
  // Call the handler
  handler(req, res);
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}/api/kma-lookup`);
  console.log('Send a POST request with curl:');
  console.log(`curl -X POST http://localhost:${PORT}/api/kma-lookup \\
  -H "Content-Type: application/json" \\
  -d '{
  "lane_id": "61f287f5-278a-4277-b3fe-9055aad1fec8",
  "origin_city": "Riegelwood",
  "origin_state": "NC",
  "destination_city": "Massillon",
  "destination_state": "OH",
  "equipment_code": "V"
}'`);
});