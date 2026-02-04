// direct-db-query.js
// Use Supabase REST API to directly query the database

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

async function executeSQL(query) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SQL execution failed: ${response.status} ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error executing SQL:', error);
    return null;
  }
}

async function diagnoseDestinationFields() {
  console.log('Diagnosing destination field issues...');

  // Query 1: Check column information for destination fields
  const columnQuery = `
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'lanes' 
    AND column_name IN ('destination_city', 'destination_state', 'dest_city', 'dest_state')
    ORDER BY column_name;
  `;
  
  const columnResult = await executeSQL(columnQuery);
  console.log('\n1. Destination field columns:');
  console.log(JSON.stringify(columnResult, null, 2));
  
  // Check if columns exist based on results
  const columnNames = columnResult ? columnResult.map(col => col.column_name) : [];
  const hasDestinationCity = columnNames.includes('destination_city');
  const hasDestinationState = columnNames.includes('destination_state');
  const hasDestCity = columnNames.includes('dest_city');
  const hasDestState = columnNames.includes('dest_state');
  
  console.log('\nColumn existence check:');
  console.log(`- destination_city exists: ${hasDestinationCity ? '✅' : '❌'}`);
  console.log(`- destination_state exists: ${hasDestinationState ? '✅' : '❌'}`);
  console.log(`- dest_city exists: ${hasDestCity ? '✅' : '❌'}`);
  console.log(`- dest_state exists: ${hasDestState ? '✅' : '❌'}`);

  // Query 2: Count affected rows (missing destination fields)
  const countQuery = `
    SELECT COUNT(*) as missing_count 
    FROM lanes 
    WHERE destination_city IS NULL AND destination_state IS NULL;
  `;
  
  const countResult = await executeSQL(countQuery);
  console.log('\n2. Affected rows count:');
  console.log(JSON.stringify(countResult, null, 2));

  // Query 3: Check specific problematic lanes from browser logs
  const specificLanesQuery = `
    SELECT id, origin_city, origin_state, destination_city, destination_state, 
    ${hasDestCity ? 'dest_city,' : ''} ${hasDestState ? 'dest_state,' : ''} 
    created_at, updated_at, created_by
    FROM lanes
    WHERE id IN (
      '96570a4b-10d2-4314-afc3-393460f8e37f','0a0aff93-fdb3-445e-b0e7-783c38ecb12c',
      'dc10eef8-277a-4447-9ab5-cd29a8c2090c','721fc962-eda2-49cc-89e1-72443b780934',
      'f7e0976f-2169-4425-b380-dc448775e16d','3e3c2456-0b23-41d0-8294-eb9a7eebd347',
      'cda2f070-2968-4acb-b991-894db659d812','44d9cb62-0e2f-4151-bbdb-d08d0c9eb8f2'
    );
  `;
  
  const specificLanesResult = await executeSQL(specificLanesQuery);
  console.log('\n3. Specific problematic lanes:');
  console.log(JSON.stringify(specificLanesResult, null, 2));

  // Query 4: Stats on destination fields
  const statsQuery = `
    SELECT 
      COUNT(*) FILTER (WHERE destination_city IS NOT NULL) AS has_city,
      COUNT(*) FILTER (WHERE destination_state IS NOT NULL) AS has_state,
      COUNT(*) AS total
    FROM lanes;
  `;
  
  const statsResult = await executeSQL(statsQuery);
  console.log('\n4. Destination field statistics:');
  console.log(JSON.stringify(statsResult, null, 2));

  // Query 5: Check table schema
  const schemaQuery = `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'lanes'
    ORDER BY ordinal_position;
  `;
  
  const schemaResult = await executeSQL(schemaQuery);
  console.log('\n5. Complete lanes table schema:');
  console.log(JSON.stringify(schemaResult, null, 2));

  // Query 6: Check RLS policies
  const policiesQuery = `
    SELECT *
    FROM pg_policies
    WHERE tablename = 'lanes';
  `;
  
  const policiesResult = await executeSQL(policiesQuery);
  console.log('\n6. RLS policies:');
  console.log(JSON.stringify(policiesResult, null, 2));
}

// Run the diagnostic
diagnoseDestinationFields().catch(error => {
  console.error('Fatal error:', error);
});