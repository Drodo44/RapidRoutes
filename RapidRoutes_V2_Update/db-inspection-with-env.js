// db-inspection-with-env.js
// Script to check problematic lane records with environment variables loaded

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env file
dotenv.config();

// Create a Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables:');
  if (!supabaseUrl) console.error('- NEXT_PUBLIC_SUPABASE_URL');
  if (!serviceRoleKey) console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

async function inspectLanes() {
  console.log('Running database inspection...');
  
  try {
    // Query 1: Check specific problematic lanes
    console.log('1. Checking specific problematic lanes:');
    const { data: specificLanes, error: specificError } = await supabase
      .from('lanes')
      .select('id, origin_city, origin_state, destination_city, destination_state, created_at, updated_at, created_by')
      .in('id', [
        '96570a4b-10d2-4314-afc3-393460f8e37f',
        '0a0aff93-fdb3-445e-b0e7-783c38ecb12c',
        'dc10eef8-277a-4447-9ab5-cd29a8c2090c',
        '721fc962-eda2-49cc-89e1-72443b780934',
        'f7e0976f-2169-4425-b380-dc448775e16d',
        '3e3c2456-0b23-41d0-8294-eb9a7eebd347',
        'cda2f070-2968-4acb-b991-894db659d812',
        '44d9cb62-0e2f-4151-bbdb-d08d0c9eb8f2'
      ]);
    
    if (specificError) {
      console.error('Error fetching specific lanes:', specificError);
    } else {
      console.log('Specific lanes data:');
      console.log(JSON.stringify(specificLanes, null, 2));
    }
    
    // Query 2: Check destination field stats
    console.log('\n2. Checking destination field statistics:');
    const { data: stats, error: statsError } = await supabase
      .from('lanes')
      .select('*');
    
    if (statsError) {
      console.error('Error fetching stats:', statsError);
    } else {
      const total = stats.length;
      const hasCity = stats.filter(lane => lane.destination_city !== null).length;
      const hasState = stats.filter(lane => lane.destination_state !== null).length;
      
      console.log('Destination field statistics:');
      console.log({
        has_city: hasCity,
        has_state: hasState,
        total: total
      });
    }
    
    // Query 3: Check table schema
    console.log('\n3. Checking table schema:');
    const { data: schema, error: schemaError } = await supabase
      .rpc('get_table_schema', { table_name: 'lanes' })
      .catch(async () => {
        // Fallback if RPC not available
        return await supabase.from('information_schema.columns')
          .select('column_name, data_type, is_nullable')
          .eq('table_name', 'lanes');
      });
    
    if (schemaError) {
      console.error('Error fetching schema:', schemaError);
    } else {
      console.log('Lanes table schema:');
      console.log(JSON.stringify(schema, null, 2));
    }
    
    // Query 4: Check if Row-Level Security policies are in place
    console.log('\n4. Checking RLS policies:');
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_table_policies', { table_name: 'lanes' })
      .catch(async () => {
        console.log('Using fallback method for RLS policies check');
        // This is just to note that we'd need a different approach
        return { data: null, error: new Error('RPC not available for policies check') };
      });
      
    if (policiesError) {
      console.log('Cannot check policies directly through Supabase client. This requires database admin access.');
    } else {
      console.log('RLS Policies:');
      console.log(policies);
    }
    
  } catch (error) {
    console.error('General error:', error);
  }
}

// Run the inspection
inspectLanes();