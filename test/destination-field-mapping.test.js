// test/destination-field-mapping.test.js

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { adminSupabase } from '../utils/supabaseClient.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

describe('Destination Field Mapping', () => {
  let testLaneId = null;

  // Create a test lane before all tests
  beforeAll(async () => {
    // Generate a unique reference ID for the test lane
    const referenceId = `TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Create a test lane with dest_city and dest_state but no destination_city/destination_state
    const testLane = {
      origin_city: 'Columbus',
      origin_state: 'OH',
      dest_city: 'Chicago',    // Using dest_city
      dest_state: 'IL',        // Using dest_state
      equipment_code: 'V',
      weight_lbs: 10000,
      length_ft: 53,
      status: 'test',
      pickup_earliest: new Date().toISOString(),
      reference_id: referenceId,
      created_at: new Date().toISOString(),
      user_id: '00000000-0000-0000-0000-000000000000', // Test user ID
      created_by: '00000000-0000-0000-0000-000000000000' // Test user ID
    };
    
    const { data, error } = await adminSupabase
      .from('lanes')
      .insert([testLane])
      .select();
      
    if (error) {
      console.error('Failed to create test lane:', error);
      throw error;
    }
    
    if (data && data.length > 0) {
      testLaneId = data[0].id;
      console.log(`Created test lane with ID: ${testLaneId}`);
    }
  });
  
  // Clean up test lane after tests
  afterAll(async () => {
    if (testLaneId) {
      const { error } = await adminSupabase
        .from('lanes')
        .delete()
        .eq('id', testLaneId);
        
      if (error) {
        console.error('Failed to delete test lane:', error);
      } else {
        console.log(`Deleted test lane with ID: ${testLaneId}`);
      }
    }
  });
  
  it('should properly map dest_city to destination_city', async () => {
    // Fetch the lane we just created
    const { data, error } = await adminSupabase
      .from('lanes')
      .select('*')
      .eq('id', testLaneId)
      .single();
      
    if (error) {
      console.error('Failed to fetch test lane:', error);
      throw error;
    }
    
    // Assert that destination_city was mapped from dest_city
    expect(data.destination_city).not.toBeNull();
    expect(data.destination_city).toBe('Chicago');
    
    // Assert that destination_state was mapped from dest_state
    expect(data.destination_state).not.toBeNull();
    expect(data.destination_state).toBe('IL');
  });
  
  it('should ensure all necessary fields exist for lane generation', async () => {
    const { data, error } = await adminSupabase
      .from('lanes')
      .select('*')
      .eq('id', testLaneId)
      .single();
    
    if (error) throw error;
    
    // Verify the fields needed for generation
    expect(data.origin_city).toBeDefined();
    expect(data.origin_state).toBeDefined();
    expect(data.equipment_code).toBeDefined();
    
    // Either destination fields should be defined
    const hasDestination = data.destination_city || data.destination_state;
    expect(hasDestination).toBeTruthy();
    
    console.log('Lane has all required fields for generation:', {
      origin_city: data.origin_city,
      origin_state: data.origin_state, 
      destination_city: data.destination_city,
      destination_state: data.destination_state,
      equipment_code: data.equipment_code
    });
  });
});