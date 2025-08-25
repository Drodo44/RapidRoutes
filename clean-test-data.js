// clean-test-data.js
// Simple script to clean test data from database

const API_BASE = 'http://localhost:3000/api';

async function cleanTestData() {
  try {
    console.log('🧹 Cleaning test data...');
    
    const response = await fetch(`${API_BASE}/cleanupTestData`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Cleanup result:', result);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

cleanTestData();
