// scripts/verify-missing-cities.js
// Script to verify and identify missing cities in the Supabase database

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Parse command line arguments if provided
function parseCityArgs() {
  // Default cities to check
  const defaults = [
    { city: 'Pasco', state: 'WA' },
    { city: 'Russellville', state: 'AR' },
    { city: 'Vancouver', state: 'WA' },
    { city: 'Frisco', state: 'TX' }
  ];
  
  // Check for command line arguments
  const args = process.argv.slice(2);
  if (args.length === 0) {
    return defaults;
  }
  
  // Parse arguments in format "City, STATE"
  return args.map(arg => {
    const parts = arg.split(',').map(part => part.trim());
    if (parts.length === 2) {
      return { city: parts[0], state: parts[1] };
    }
    console.warn(`${colors.yellow}Warning: Could not parse argument "${arg}" - expected format "City, STATE"${colors.reset}`);
    return null;
  }).filter(Boolean);
}

// Cities to check - either from command line or defaults
const citiesToCheck = parseCityArgs();

// Initialize Supabase client
const initSupabase = () => {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Missing Supabase credentials. Please check your .env file.');
  }
  
  console.log(`${colors.dim}Using Supabase URL: ${SUPABASE_URL}${colors.reset}`);
  console.log(`${colors.dim}Using Supabase Key: ${SUPABASE_SERVICE_KEY ? '***' : 'undefined'}${colors.reset}`);
  
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
};

// Verify cities in database
async function verifyCitiesInDb(supabase) {
  console.log(`${colors.blue}${colors.bright}=== Verifying Cities in Database ====${colors.reset}\n`);
  
  const missingCities = [];
  const foundCities = [];
  
  for (const { city, state } of citiesToCheck) {
    try {
      console.log(`${colors.dim}Checking ${city}, ${state}...${colors.reset}`);
      
      // Search for city in database - case insensitive
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .ilike('city', city)
        .eq('state_or_province', state);
      
      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.log(`${colors.red}❌ Not found: ${city}, ${state}${colors.reset}`);
        missingCities.push({ city, state });
      } else {
        console.log(`${colors.green}✅ Found: ${city}, ${state}${colors.reset}`);
        console.log(`${colors.dim}  KMA Code: ${data[0].kma_code || 'N/A'}${colors.reset}`);
        foundCities.push({ 
          city, 
          state, 
          dbEntry: data[0],
          exactMatch: data[0].city === city
        });
      }
    } catch (error) {
      console.error(`${colors.red}Error checking ${city}, ${state}:${colors.reset}`, error.message);
    }
  }
  
  return { missingCities, foundCities };
}

// Get city data from external API
async function fetchCityData(city, state) {
  try {
    // This is a placeholder - you would replace with an actual geocoding API
    const response = await fetch(`https://api.geocoding-service.com/geocode?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`${colors.red}Error fetching data for ${city}, ${state}:${colors.reset}`, error.message);
    return null;
  }
}

// Generate SQL to add missing cities
function generateInsertSql(missingCities) {
  if (missingCities.length === 0) return '';
  
  let sql = '-- SQL to insert missing cities:\n';
  
  missingCities.forEach(({ city, state }) => {
    // You'll need to add actual latitude, longitude, KMA code and other fields
    sql += `INSERT INTO cities (city, state_or_province) VALUES ('${city}', '${state}');\n`;
  });
  
  return sql;
}

// Main function
async function main() {
  try {
    // Initialize Supabase client
    const supabase = initSupabase();
    
    // Verify cities in database
    const { missingCities, foundCities } = await verifyCitiesInDb(supabase);
    
    // Print summary
    console.log(`\n${colors.blue}${colors.bright}=== Summary ====${colors.reset}`);
    console.log(`${colors.green}Cities found: ${foundCities.length}${colors.reset}`);
    console.log(`${colors.red}Cities missing: ${missingCities.length}${colors.reset}`);
    
    // Check for case mismatches
    const caseMismatches = foundCities.filter(city => !city.exactMatch);
    if (caseMismatches.length > 0) {
      console.log(`\n${colors.yellow}${colors.bright}=== Case Mismatches ====${colors.reset}`);
      caseMismatches.forEach(({ city, state, dbEntry }) => {
        console.log(`${colors.yellow}⚠️ Case mismatch: "${city}" vs "${dbEntry.city}"${colors.reset}`);
      });
    }
    
    // Print missing cities
    if (missingCities.length > 0) {
      console.log(`\n${colors.red}${colors.bright}=== Missing Cities ====${colors.reset}`);
      missingCities.forEach(({ city, state }) => {
        console.log(`${colors.red}❌ ${city}, ${state}${colors.reset}`);
      });
      
      // Generate SQL
      const sql = generateInsertSql(missingCities);
      console.log(`\n${colors.cyan}${colors.bright}=== SQL to Add Missing Cities ====${colors.reset}`);
      console.log(sql);
      
      console.log(`\n${colors.yellow}NOTE: The SQL above is incomplete. You'll need to add latitude, longitude, KMA code, and other fields.${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.red}${colors.bright}Error:${colors.reset}`, error.message);
  }
}

// Run the script
main().catch(console.error);