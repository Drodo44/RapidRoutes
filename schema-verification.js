// schema-verification.js
// Script to verify database schema and check existing data

import { adminSupabase } from './utils/supabaseClient.js';

async function verifySchema() {
  try {
    console.log('Verifying database schema and lane data...');
    
    // 1. Check if destination_city and destination_state columns exist
    const { data: columns, error: schemaError } = await adminSupabase.rpc('executeSQL', {
      sql: `
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'lanes' 
      AND column_name IN ('destination_city', 'destination_state', 'dest_city', 'dest_state')
      ORDER BY column_name
      `
    });
    
    if (schemaError) {
      console.error('Error querying schema:', schemaError);
      return;
    }
    
    console.log('\n=== LANE TABLE COLUMN VERIFICATION ===');
    if (columns && columns.length > 0) {
      console.table(columns);
      
      // Check which columns exist
      const columnNames = columns.map(col => col.column_name);
      const hasDestinationCity = columnNames.includes('destination_city');
      const hasDestinationState = columnNames.includes('destination_state');
      const hasDestCity = columnNames.includes('dest_city');
      const hasDestState = columnNames.includes('dest_state');
      
      console.log('\nColumn verification:');
      console.log(`- destination_city exists: ${hasDestinationCity ? '✅' : '❌'}`);
      console.log(`- destination_state exists: ${hasDestinationState ? '✅' : '❌'}`);
      console.log(`- dest_city exists: ${hasDestCity ? '✅' : '❌'}`);
      console.log(`- dest_state exists: ${hasDestState ? '✅' : '❌'}`);
      
      // Save for return value
      const columnVerification = { hasDestinationCity, hasDestinationState, hasDestCity, hasDestState };
      
      // 2. Count affected rows (missing destination fields)
      const { data: missingCount, error: countError } = await adminSupabase.rpc('executeSQL', {
        sql: `
        SELECT COUNT(*) as missing_count 
        FROM lanes 
        WHERE destination_city IS NULL AND destination_state IS NULL
        `
      });
      
      if (countError) {
        console.error('Error counting affected rows:', countError);
      } else {
        console.log('\n=== AFFECTED ROWS COUNT ===');
        console.log(`Lanes with NULL destination_city AND destination_state: ${missingCount[0].missing_count}`);
        
        // 3. Get sample of affected rows
        const { data: sampleLanes, error: sampleError } = await adminSupabase.rpc('executeSQL', {
          sql: `
          SELECT id, origin_city, origin_state, destination_city, destination_state, 
          ${hasDestCity ? 'dest_city,' : ''} ${hasDestState ? 'dest_state,' : ''} created_at
          FROM lanes 
          WHERE destination_city IS NULL AND destination_state IS NULL
          ORDER BY created_at DESC
          LIMIT 8
          `
        });
        
        if (sampleError) {
          console.error('Error fetching sample lanes:', sampleError);
        } else if (sampleLanes && sampleLanes.length > 0) {
          console.log('\n=== SAMPLE AFFECTED LANES ===');
          console.table(sampleLanes);
          console.log('\nSample lane IDs for reference:');
          sampleLanes.forEach(lane => {
            console.log(`- ${lane.id}`);
          });
        } else {
          console.log('No affected lanes found.');
        }
        
        return {
          columnVerification,
          missingCount: missingCount[0].missing_count,
          sampleLanes
        };
      }
    } else {
      console.log('No columns found. Is the lanes table properly created?');
    }
    
  } catch (error) {
    console.error('Schema verification failed:', error);
  }
}

// Run the verification
verifySchema()
  .then(results => {
    console.log('\nSchema verification completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });