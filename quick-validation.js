// quick-validation.js
import { adminSupabase } from './utils/supabaseClient.js';

async function validateCore() {
  console.log('🔍 Running Quick System Validation\n');

  // 0. Check Supabase Configuration
  console.log('Supabase Configuration:');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET';
  console.log(`URL: ${url}`);
  
  // 1. Check Database Connection
  try {
    console.log('Testing Supabase Connection...');
    const { data, error } = await adminSupabase
      .from('cities')
      .select('*');

    if (error) throw error;
    console.log(`✅ Database Connected - Found ${data.length} cities`);
    
    // Check available tables
    const { data: tables, error: tablesError } = await adminSupabase
      .from('_tables')
      .select('*');
      
    if (!tablesError) {
      console.log('\nAvailable Tables:');
      tables.forEach(table => console.log(`  • ${table.name}`));
    }
  } catch (error) {
    console.error('❌ Database Connection Failed:', error.message);
    return;
  }

  // 2. Check City Data Quality
  try {
    console.log('\nChecking City Data Quality...');
    const { data: issues, error } = await adminSupabase
      .from('cities')
      .select('*')
      .or('latitude.is.null,longitude.is.null,kma_code.is.null')
      .limit(5);

    if (error) throw error;

    if (issues.length > 0) {
      console.log('⚠️ Found Data Quality Issues:');
      issues.forEach(city => {
        console.log(`  • ${city.city}, ${city.state_or_province}:`);
        if (!city.latitude || !city.longitude) console.log('    - Missing coordinates');
        if (!city.kma_code) console.log('    - Missing KMA code');
      });
    } else {
      console.log('✅ No immediate data quality issues found');
    }
  } catch (error) {
    console.error('❌ Data Quality Check Failed:', error.message);
  }

  // 3. Check KMA Distribution
  try {
    console.log('\nAnalyzing KMA Distribution...');
    const { data: kmaStats, error } = await adminSupabase
      .from('cities')
      .select('kma_code')
      .not('kma_code', 'is', null);

    if (error) throw error;

    const kmaCounts = {};
    kmaStats.forEach(row => {
      kmaCounts[row.kma_code] = (kmaCounts[row.kma_code] || 0) + 1;
    });

    const uniqueKMAs = Object.keys(kmaCounts);
    console.log(`Found ${uniqueKMAs.length} unique KMA codes`);

    // Sort KMAs by city count
    const sortedKMAs = Object.entries(kmaCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    console.log('\nTop 5 KMAs by City Count:');
    sortedKMAs.forEach(([kma, count]) => {
      console.log(`  • ${kma}: ${count} cities`);
    });

  } catch (error) {
    console.error('❌ KMA Analysis Failed:', error.message);
  }

  // 4. Validate Coordinates
  try {
    console.log('\nValidating Coordinate Ranges...');
    const { data: invalidCoords, error } = await adminSupabase
      .from('cities')
      .select('*')
      .or('latitude.gt.90,latitude.lt.-90,longitude.gt.180,longitude.lt.-180')
      .limit(5);

    if (error) throw error;

    if (invalidCoords.length > 0) {
      console.log('⚠️ Found Invalid Coordinates:');
      invalidCoords.forEach(city => {
        console.log(`  • ${city.city}, ${city.state_or_province}: (${city.latitude}, ${city.longitude})`);
      });
    } else {
      console.log('✅ All coordinates within valid ranges');
    }
  } catch (error) {
    console.error('❌ Coordinate Validation Failed:', error.message);
  }
}

validateCore();