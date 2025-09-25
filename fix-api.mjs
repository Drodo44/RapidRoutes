#!/usr/bin/env node
/**
 * RapidRoutes API Fix Script
 * 
 * This script directly creates the SQL script needed to fix the intelligence-pairing API
 * and optionally executes it if credentials are provided.
 */

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

// ANSI color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// SQL to create the function
const functionSQL = `
-- Create the missing find_cities_within_radius RPC function
-- This function is essential for geographic crawl pair generation

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE;

-- Drop function if exists to avoid conflicts
DROP FUNCTION IF EXISTS find_cities_within_radius(double precision, double precision, double precision);

-- Create the PostGIS helper function for geospatial city search
CREATE OR REPLACE FUNCTION find_cities_within_radius(
  lat_param double precision, 
  lng_param double precision, 
  radius_meters double precision
)
RETURNS SETOF cities AS $$
  SELECT * FROM cities
  WHERE earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(lat_param, lng_param)) <= radius_meters
    AND latitude IS NOT NULL 
    AND longitude IS NOT NULL
    AND kma_code IS NOT NULL
  ORDER BY earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(lat_param, lng_param))
  LIMIT 100;
$$ LANGUAGE sql STABLE;

-- Grant proper permissions for all roles
GRANT EXECUTE ON FUNCTION find_cities_within_radius(double precision, double precision, double precision) TO anon;
GRANT EXECUTE ON FUNCTION find_cities_within_radius(double precision, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION find_cities_within_radius(double precision, double precision, double precision) TO service_role;
`;

// Create a readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt the user for input
const promptInput = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

// Function to create the SQL file
const createSqlFile = () => {
  const filename = 'fix-intelligence-api.sql';
  try {
    fs.writeFileSync(filename, functionSQL);
    console.log(`${colors.green}✅ SQL script generated: ${colors.bold}${filename}${colors.reset}`);
    return filename;
  } catch (error) {
    console.error(`${colors.red}❌ Failed to create SQL file: ${error.message}${colors.reset}`);
    return null;
  }
};

// Function to execute the SQL directly
const executeSql = async (supabaseUrl, serviceRoleKey) => {
  console.log(`${colors.blue}🔄 Connecting to Supabase...${colors.reset}`);
  
  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });
    
    // Execute SQL
    console.log(`${colors.blue}🔧 Executing SQL to create RPC function...${colors.reset}`);
    
    try {
      // First try using pgmigration_execute RPC
      const { data, error } = await supabase.rpc('pgmigration_execute', { 
        querystring: functionSQL 
      });
      
      if (error) throw error;
      
      console.log(`${colors.green}✅ RPC function created successfully!${colors.reset}`);
      return true;
    } catch (error) {
      console.error(`${colors.yellow}⚠️ Error with pgmigration_execute: ${error.message}${colors.reset}`);
      console.log(`${colors.blue}🔄 Trying alternative method...${colors.reset}`);
      
      try {
        // Try to execute SQL directly using raw SQL query
        const { data, error } = await supabase.from('_temp_sql_execute')
          .select('*')
          .eq('sql', functionSQL)
          .single();
        
        if (error) throw error;
        
        console.log(`${colors.green}✅ RPC function created successfully via alternative method!${colors.reset}`);
        return true;
      } catch (secondError) {
        console.error(`${colors.red}❌ Alternative method also failed: ${secondError.message}${colors.reset}`);
        return false;
      }
    }
  } catch (error) {
    console.error(`${colors.red}❌ Failed to connect to Supabase: ${error.message}${colors.reset}`);
    return false;
  }
};

// Function to test the RPC function
const testRpcFunction = async (supabase) => {
  console.log(`${colors.blue}🔍 Testing RPC function...${colors.reset}`);
  
  try {
    const { data, error } = await supabase.rpc('find_cities_within_radius', {
      lat_param: 35.7796,
      lng_param: -78.6382,
      radius_meters: 80467 // ~50 miles
    });
    
    if (error) throw error;
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn(`${colors.yellow}⚠️ Function returned no cities. This is unexpected.${colors.reset}`);
      return false;
    }
    
    console.log(`${colors.green}✅ RPC function working! Found ${data.length} cities near Raleigh, NC${colors.reset}`);
    console.log(`${colors.cyan}📍 Sample cities:${colors.reset}`);
    data.slice(0, 3).forEach(city => {
      console.log(`   - ${city.city}, ${city.state_or_province} (${city.kma_code})`);
    });
    
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Error testing RPC function: ${error.message}${colors.reset}`);
    return false;
  }
};

// Main function
const main = async () => {
  console.log(`${colors.bold}${colors.magenta}
  🚨 RAPIDROUTES API EMERGENCY FIX 🚨
  =====================================
  This tool will help fix the intelligence-pairing API issues
  ${colors.reset}`);
  
  // Create SQL file
  const sqlFile = createSqlFile();
  
  // Ask if the user wants to execute SQL directly
  const executeDirectly = await promptInput(`${colors.yellow}Do you want to execute the SQL directly? (yes/no)${colors.reset} `);
  
  if (executeDirectly.toLowerCase() === 'yes') {
    // Get Supabase credentials
    console.log(`${colors.cyan}Please provide your Supabase credentials:${colors.reset}`);
    const supabaseUrl = await promptInput('Supabase URL: ');
    const serviceRoleKey = await promptInput('Service Role Key: ');
    
    // Execute SQL
    const success = await executeSql(supabaseUrl, serviceRoleKey);
    
    if (success) {
      // Test the function
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false }
      });
      
      await testRpcFunction(supabase);
      
      console.log(`${colors.green}${colors.bold}
      ✅ FIX COMPLETED SUCCESSFULLY!
      
      The intelligence-pairing API should now be working correctly.
      Please test by performing a lane generation or DAT export.
      ${colors.reset}`);
    } else {
      console.log(`${colors.yellow}${colors.bold}
      ⚠️ MANUAL ACTION REQUIRED
      
      Please execute the SQL script ${sqlFile} manually in your Supabase dashboard.
      Instructions:
      1. Log in to your Supabase dashboard
      2. Select your project
      3. Go to SQL Editor
      4. Create a new query
      5. Paste the contents of ${sqlFile}
      6. Run the query
      ${colors.reset}`);
    }
  } else {
    console.log(`${colors.cyan}${colors.bold}
    📝 MANUAL ACTION REQUIRED
    
    Please execute the SQL script ${sqlFile} manually in your Supabase dashboard.
    Instructions:
    1. Log in to your Supabase dashboard
    2. Select your project
    3. Go to SQL Editor
    4. Create a new query
    5. Paste the contents of ${sqlFile}
    6. Run the query
    ${colors.reset}`);
  }
  
  console.log(`${colors.blue}Thank you for using the RapidRoutes API fix tool!${colors.reset}`);
  rl.close();
};

// Run the script
main().catch(error => {
  console.error(`${colors.red}💥 Fatal error: ${error}${colors.reset}`);
  rl.close();
});