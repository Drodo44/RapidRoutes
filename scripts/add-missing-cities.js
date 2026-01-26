// scripts/add-missing-cities.js
// Script to add missing cities to the Supabase database

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

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

// Cities to add - modify this array as needed
const citiesToAdd = [
  { city: 'Pasco', state: 'WA' },
  { city: 'Russellville', state: 'AR' },
  { city: 'Vancouver', state: 'WA' },
  { city: 'Frisco', state: 'TX' },
];

// Initialize Supabase client
const initSupabase = () => {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Missing Supabase credentials. Please check your .env file.');
  }
  
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
};

// Fetch geocoding information for a city
async function geocodeCity(city, state) {
  try {
    // Using a geocoding API - replace with your preferred geocoding service
    // This example uses OpenCage Data API - you'll need an API key
    const geocodingApiKey = process.env.GEOCODING_API_KEY;
    if (!geocodingApiKey) {
      throw new Error('Missing GEOCODING_API_KEY in .env file');
    }
    
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(city)}%2C%20${encodeURIComponent(state)}%2C%20USA&key=${geocodingApiKey}&limit=1`;
    
    console.log(`${colors.dim}Geocoding ${city}, ${state}...${colors.reset}`);
    const response = await axios.get(url);
    
    if (response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      return {
        city,
        state,
        latitude: result.geometry.lat,
        longitude: result.geometry.lng,
        zip: result.components.postcode || '',
        confidence: result.confidence
      };
    }
    
    throw new Error(`No results found for ${city}, ${state}`);
  } catch (error) {
    console.error(`${colors.red}Error geocoding ${city}, ${state}:${colors.reset}`, error.message);
    return null;
  }
}

// Find closest KMA
async function findClosestKma(supabase, latitude, longitude) {
  try {
    // Use Supabase PostgreSQL functions for geospatial queries
    // This requires that you have a geospatial function in your database
    const { data, error } = await supabase.rpc('find_closest_kma', {
      lat: latitude,
      lon: longitude,
      max_distance_miles: 100
    });
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      return data[0];
    }
    
    // Fallback method - find an existing city with similar coordinates
    const { data: nearbyCity, error: nearbyCityError } = await supabase
      .from('cities')
      .select('kma_code, kma_name')
      .not('kma_code', 'is', null)
      .order(`(latitude - ${latitude})^2 + (longitude - ${longitude})^2`)
      .limit(1);
    
    if (nearbyCityError) throw nearbyCityError;
    
    if (nearbyCity && nearbyCity.length > 0) {
      return nearbyCity[0];
    }
    
    return null;
  } catch (error) {
    console.error(`${colors.red}Error finding closest KMA:${colors.reset}`, error.message);
    return null;
  }
}

// Add city to database
async function addCityToDatabase(supabase, cityData) {
  try {
    console.log(`${colors.blue}Adding city to database: ${cityData.city}, ${cityData.state}${colors.reset}`);
    
    const { data, error } = await supabase
      .from('cities')
      .insert([cityData])
      .select();
    
    if (error) throw error;
    
    console.log(`${colors.green}✅ Successfully added ${cityData.city}, ${cityData.state} to database${colors.reset}`);
    return data?.[0];
  } catch (error) {
    console.error(`${colors.red}Error adding city to database:${colors.reset}`, error.message);
    return null;
  }
}

// Main function
async function main() {
  try {
    const supabase = initSupabase();
    
    console.log(`${colors.blue}${colors.bright}=== Adding Missing Cities to Database ====${colors.reset}\n`);
    
    for (const { city, state } of citiesToAdd) {
      // Check if city already exists
      const { data: existingCity, error } = await supabase
        .from('cities')
        .select('*')
        .ilike('city', city)
        .eq('state_or_province', state);
      
      if (error) {
        console.error(`${colors.red}Error checking if city exists:${colors.reset}`, error.message);
        continue;
      }
      
      if (existingCity && existingCity.length > 0) {
        console.log(`${colors.yellow}⚠️ City already exists: ${city}, ${state}${colors.reset}`);
        continue;
      }
      
      // Geocode city
      const geocodedCity = await geocodeCity(city, state);
      if (!geocodedCity) {
        console.log(`${colors.red}❌ Failed to geocode ${city}, ${state}. Skipping...${colors.reset}`);
        continue;
      }
      
      // Find closest KMA
      const closestKma = await findClosestKma(supabase, geocodedCity.latitude, geocodedCity.longitude);
      
      // Prepare city data
      const cityData = {
        city: city,
        state_or_province: state,
        latitude: geocodedCity.latitude,
        longitude: geocodedCity.longitude,
        zip: geocodedCity.zip,
        kma_code: closestKma?.kma_code || null,
        kma_name: closestKma?.kma_name || null
      };
      
      // Add city to database
      await addCityToDatabase(supabase, cityData);
    }
    
    console.log(`\n${colors.blue}${colors.bright}=== Process Complete ====${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}${colors.bright}Error:${colors.reset}`, error.message);
  }
}

// Run the script
main().catch(console.error);