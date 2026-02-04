#!/usr/bin/env node
// verify-intelligence-fix.js - Quick verification script for intelligence pairing API

import fetch from 'node-fetch';

async function verifyIntelligencePairingFix() {
  try {
    console.log('Verifying intelligence-pairing API fixes...');
    
    const testData = {
      originCity: 'Chicago',
      originState: 'IL',
      destCity: 'Atlanta', 
      destState: 'GA'
    };
    
    const response = await fetch('http://localhost:3000/api/intelligence-pairing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));
    
    if (result.error) {
      console.error('API error:', result.error);
      process.exit(1);
    }
    
    console.log('Verification complete!');
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

verifyIntelligencePairingFix();