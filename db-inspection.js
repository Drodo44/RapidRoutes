// db-inspection.js
// Script to check problematic lane records directly using the Supabase client

import { adminSupabase } from './utils/supabaseClient.js';

async function inspectLanes() {
  console.log('Running database inspection...');
  
  try {
    // Query 1: Check specific problematic lanes
    console.log('1. Checking specific problematic lanes:');
    const { data: specificLanes, error: specificError } = await adminSupabase
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
    const { data: stats, error: statsError } = await adminSupabase
      .rpc('count_destination_stats');
    
    if (statsError) {
      console.error('Error fetching destination stats:', statsError);
      
      // Fallback to raw SQL via the `.sql` method if RPC not available
      const { data: rawStats, error: rawStatsError } = await adminSupabase
        .from('lanes')
        .select('count(*)')
        .then(result => {
          const total = result.data ? result.data.length : 0;
          
          return adminSupabase
            .from('lanes')
            .select('count(*)')
            .not('destination_city', 'is', null)
            .then(cityResult => {
              const hasCity = cityResult.data ? cityResult.data.length : 0;
              
              return adminSupabase
                .from('lanes')
                .select('count(*)')
                .not('destination_state', 'is', null)
                .then(stateResult => {
                  const hasState = stateResult.data ? stateResult.data.length : 0;
                  
                  return {
                    data: {
                      has_city: hasCity,
                      has_state: hasState,
                      total: total
                    },
                    error: null
                  };
                });
            });
        });
      
      if (rawStatsError) {
        console.error('Error fetching raw stats:', rawStatsError);
      } else {
        console.log('Destination field statistics:');
        console.log(rawStats);
      }
    } else {
      console.log('Destination field statistics:');
      console.log(stats);
    }
    
    // Query 3: Check table schema
    console.log('\n3. Checking table schema:');
    const { data: schema, error: schemaError } = await adminSupabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'lanes');
    
    if (schemaError) {
      console.error('Error fetching schema:', schemaError);
    } else {
      console.log('Lanes table schema:');
      console.log(JSON.stringify(schema, null, 2));
    }
    
  } catch (error) {
    console.error('General error:', error);
  }
}

// Run the inspection
inspectLanes();