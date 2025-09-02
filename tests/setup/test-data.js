/**
 * Test data setup for geographic crawl tests
 */

import { vi } from 'vitest';
import { vi } from 'vitest';
import { mockSupabase } from './mock-supabase.js';

export const TEST_CITIES = [
    // Major Cities
    { city: 'Chicago', state_or_province: 'IL', zip: '60601', latitude: 41.8781, longitude: -87.6298, industrial_score: 0.9, kma_code: 'CHI', test: true },
    { city: 'Atlanta', state_or_province: 'GA', zip: '30303', latitude: 33.7490, longitude: -84.3880, industrial_score: 0.85, kma_code: 'ATL', test: true },
    { city: 'Dallas', state_or_province: 'TX', zip: '75201', latitude: 32.7767, longitude: -96.7970, industrial_score: 0.88, kma_code: 'DAL', test: true },
    { city: 'Houston', state_or_province: 'TX', zip: '77002', latitude: 29.7604, longitude: -95.3698, industrial_score: 0.92, kma_code: 'HOU', test: true },
    { city: 'Los Angeles', state_or_province: 'CA', zip: '90012', latitude: 34.0522, longitude: -118.2437, industrial_score: 0.95, kma_code: 'LAX', test: true },
    { city: 'Phoenix', state_or_province: 'AZ', zip: '85004', latitude: 33.4484, longitude: -112.0740, industrial_score: 0.82, kma_code: 'PHX', test: true },
    
    // Chicago Area
    { city: 'Oak Park', state_or_province: 'IL', zip: '60302', latitude: 41.8850, longitude: -87.7845, industrial_score: 0.75, kma_code: 'CHI', test: true },
    { city: 'Evanston', state_or_province: 'IL', zip: '60201', latitude: 42.0451, longitude: -87.6877, industrial_score: 0.7, kma_code: 'CHI', test: true },
    { city: 'Cicero', state_or_province: 'IL', zip: '60804', latitude: 41.8456, longitude: -87.7539, industrial_score: 0.85, kma_code: 'CHI', test: true },
    { city: 'Hammond', state_or_province: 'IN', zip: '46320', latitude: 41.5833, longitude: -87.5000, industrial_score: 0.88, kma_code: 'CHI', test: true },
    
    // Mountain Region
    { city: 'Salt Lake City', state_or_province: 'UT', zip: '84111', latitude: 40.7608, longitude: -111.8910, industrial_score: 0.78, kma_code: 'SLC', test: true },
    { city: 'Bozeman', state_or_province: 'MT', zip: '59715', latitude: 45.6770, longitude: -111.0429, industrial_score: 0.65, kma_code: 'BZN', test: true },
    { city: 'Ogden', state_or_province: 'UT', zip: '84401', latitude: 41.2230, longitude: -111.9738, industrial_score: 0.72, kma_code: 'SLC', test: true },
    { city: 'Provo', state_or_province: 'UT', zip: '84601', latitude: 40.2338, longitude: -111.6585, industrial_score: 0.7, kma_code: 'SLC', test: true },
    
    // Industrial Corridor
    { city: 'Pittsburgh', state_or_province: 'PA', zip: '15222', latitude: 40.4406, longitude: -79.9959, industrial_score: 0.95, kma_code: 'PIT', test: true },
    { city: 'Cleveland', state_or_province: 'OH', zip: '44113', latitude: 41.4995, longitude: -81.6954, industrial_score: 0.92, kma_code: 'CLE', test: true },
    { city: 'Akron', state_or_province: 'OH', zip: '44308', latitude: 41.0814, longitude: -81.5190, industrial_score: 0.88, kma_code: 'CLE', test: true },
    { city: 'Youngstown', state_or_province: 'OH', zip: '44503', latitude: 41.0998, longitude: -80.6495, industrial_score: 0.85, kma_code: 'YNG', test: true }
];

export async function setupTestData() {
    // Set up mock data
    await mockSupabase.from('cities').insert(TEST_CITIES);
    
    console.log('✅ Test data setup complete');
}

export async function cleanupTestData() {
    // Clean up mock data
    await mockSupabase.from('cities').delete().eq('test', true);
    
    console.log('✅ Test data cleanup complete');
}

// Run setup if this file is run directly
if (import.meta.url.endsWith('test-data.js')) {
    await setupTestData();
}
