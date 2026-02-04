// scripts/debug-server.js
// This creates a simple local debug server to test API issues

import express from 'express';
import bodyParser from 'body-parser';
import { generateGeographicCrawlPairs } from '../lib/geographicCrawl.js';
import { adminSupabase } from '../utils/supabaseClient.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
app.use(bodyParser.json());

// Debug endpoint that logs all request details
app.post('/api/debug-intelligence', async (req, res) => {
  console.log('\n🔍 DEBUG REQUEST:');
  console.log('📦 Headers:', req.headers);
  console.log('📦 Body:', JSON.stringify(req.body, null, 2));
  
  // Extract and normalize fields
  const {
    lane_id,
    laneId,
    origin_city,
    originCity, 
    origin_state,
    originState,
    origin_zip,
    originZip,
    destination_city,
    destinationCity,
    dest_city,
    destination_state,
    destinationState,
    dest_state,
    destination_zip,
    destinationZip,
    dest_zip,
    equipment_code,
    equipmentCode,
    test_mode = false,
    mock_auth = false,
  } = req.body;

  // Normalize field names with detailed logging
  const normalizedFields = {
    lane_id: lane_id || laneId,
    origin_city: origin_city || originCity,
    origin_state: origin_state || originState,
    origin_zip: origin_zip || originZip || '',
    destination_city: destination_city || destinationCity || dest_city,
    destination_state: destination_state || destinationState || dest_state,
    destination_zip: destination_zip || destinationZip || dest_zip || '',
    equipment_code: equipment_code || equipmentCode || 'V', // Default to 'V' if not provided
    test_mode: test_mode === true,
    mock_auth: mock_auth === true,
  };
  
  console.log('📦 Normalized fields:', normalizedFields);
  
  // Check for missing fields
  const missingFields = [];
  if (!normalizedFields.origin_city) missingFields.push('origin_city/originCity');
  if (!normalizedFields.origin_state) missingFields.push('origin_state/originState');
  if (!normalizedFields.destination_city) missingFields.push('destination_city/destinationCity/dest_city');
  if (!normalizedFields.destination_state) missingFields.push('destination_state/destinationState/dest_state');
  
  if (missingFields.length > 0) {
    console.log('❌ Missing required fields:', missingFields);
    return res.status(400).json({
      error: 'Missing required fields',
      missingFields,
      receivedFields: normalizedFields
    });
  }
  
  try {
    // Call the geographic crawl function
    console.log('🚀 Calling geographic crawl function with:');
    console.log({
      originCity: normalizedFields.origin_city,
      originState: normalizedFields.origin_state,
      destCity: normalizedFields.destination_city,
      destState: normalizedFields.destination_state,
      equipmentCode: normalizedFields.equipment_code
    });
    
    const result = await generateGeographicCrawlPairs({
      originCity: normalizedFields.origin_city,
      originState: normalizedFields.origin_state,
      destCity: normalizedFields.destination_city,
      destState: normalizedFields.destination_state,
      equipmentCode: normalizedFields.equipment_code
    }, adminSupabase);
    
    console.log(`✅ Generated ${result?.pairs?.length || 0} pairs`);
    
    // Count unique KMAs
    const kmas = new Set();
    if (result?.pairs) {
      result.pairs.forEach(pair => {
        if (pair.originKma) kmas.add(pair.originKma);
        if (pair.destKma) kmas.add(pair.destKma);
      });
    }
    
    console.log(`🧩 Found ${kmas.size} unique KMAs`);
    
    return res.json({
      success: true,
      ...result,
      uniqueKmaCount: kmas.size,
      debug: { normalizedFields }
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
    return res.status(500).json({
      error: error.message,
      debug: { normalizedFields }
    });
  }
});

// Handle POST requests to the main intelligence API route
app.post('/api/intelligence-pairing', async (req, res) => {
  console.log('\n📩 Received request to intelligence-pairing API');
  
  // Forward to the debug handler
  req.url = '/api/debug-intelligence';
  app._router.handle(req, res);
});

// Start server
const PORT = 3333;
app.listen(PORT, () => {
  console.log(`🚀 Debug server running on http://localhost:${PORT}`);
  console.log('📝 Available endpoints:');
  console.log('  - POST /api/intelligence-pairing');
  console.log('  - POST /api/debug-intelligence');
});