import { adminSupabase } from './utils/supabaseClient.js';

async function cleanCityDuplicates() {
  console.log('🧹 Cleaning city duplicates in the database...');
  
  try {
    // First check current counts
    console.log('\n📊 Current database status:');
    const { count: originalCount } = await adminSupabase
      .from('cities')
      .select('*', { count: 'exact', head: true });
    console.log(`   Total cities: ${originalCount}`);
    
    // Count duplicates
    const { data: duplicateCheck } = await adminSupabase.rpc('count_city_duplicates');
    
    // Create clean table with DISTINCT ON
    console.log('\n🚀 Creating clean cities table...');
    
    // Since Supabase doesn't support DISTINCT ON directly, we'll do this differently
    // Get all cities and deduplicate in JavaScript
    const { data: allCities, error: fetchError } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .not('kma_code', 'is', null);
    
    if (fetchError) {
      console.error('❌ Error fetching cities:', fetchError);
      return;
    }
    
    console.log(`📥 Fetched ${allCities.length} cities with valid data`);
    
    // Deduplicate by keeping first occurrence of each city/state combination
    const seen = new Set();
    const cleanCities = [];
    
    // Sort by city, state, then zip to get consistent results
    const sortedCities = allCities.sort((a, b) => {
      const aKey = `${a.city}, ${a.state_or_province}`;
      const bKey = `${b.city}, ${b.state_or_province}`;
      if (aKey !== bKey) return aKey.localeCompare(bKey);
      return (a.zip || '').localeCompare(b.zip || '');
    });
    
    for (const city of sortedCities) {
      const key = `${city.city.toLowerCase()}, ${city.state_or_province.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        cleanCities.push(city);
      }
    }
    
    console.log(`🎯 Deduplicated to ${cleanCities.length} unique cities`);
    console.log(`💾 Space saved: ${allCities.length - cleanCities.length} duplicate entries removed`);
    
    // Create the clean table
    const { error: createError } = await adminSupabase.rpc('create_clean_cities_table');
    
    if (createError) {
      console.log('⚠️ Clean table may already exist, trying to truncate...');
      const { error: truncateError } = await adminSupabase
        .from('cities_clean')
        .delete()
        .neq('city', 'impossible_city_name_that_does_not_exist');
      
      if (truncateError) {
        console.error('❌ Could not clear clean table:', truncateError);
      }
    }
    
    // Insert clean data in batches
    console.log('📝 Inserting clean data...');
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < cleanCities.length; i += batchSize) {
      const batch = cleanCities.slice(i, i + batchSize);
      const { error: insertError } = await adminSupabase
        .from('cities_clean')
        .insert(batch);
      
      if (insertError) {
        console.error(`❌ Error inserting batch ${i}-${i + batch.length}:`, insertError);
        break;
      }
      
      inserted += batch.length;
      if (i % (batchSize * 10) === 0) {
        console.log(`   Inserted ${inserted}/${cleanCities.length} cities...`);
      }
    }
    
    console.log(`✅ Successfully inserted ${inserted} clean cities`);
    
    // Verify no duplicates in clean table
    console.log('\n🔍 Verifying clean table...');
    const { data: cleanData } = await adminSupabase
      .from('cities_clean')
      .select('city, state_or_province');
    
    const cleanCheck = new Map();
    let duplicatesFound = 0;
    
    for (const city of cleanData || []) {
      const key = `${city.city.toLowerCase()}, ${city.state_or_province.toLowerCase()}`;
      if (cleanCheck.has(key)) {
        duplicatesFound++;
        console.log(`❌ Duplicate found: ${city.city}, ${city.state_or_province}`);
      } else {
        cleanCheck.set(key, true);
      }
    }
    
    if (duplicatesFound === 0) {
      console.log('✅ No duplicates found in clean table!');
      console.log(`📊 Clean table has ${cleanData.length} unique cities`);
      
      console.log('\n🎯 READY TO REPLACE ORIGINAL TABLE');
      console.log('   Run the replacement manually once you verify the clean data:');
      console.log('   1. DROP TABLE cities;');  
      console.log('   2. ALTER TABLE cities_clean RENAME TO cities;');
    } else {
      console.log(`❌ Found ${duplicatesFound} duplicates in clean table - something went wrong`);
    }
    
    // Show some sample cities from clean table
    console.log('\n📋 Sample clean cities:');
    const { data: samples } = await adminSupabase
      .from('cities_clean')
      .select('city, state_or_province, zip, kma_code')
      .limit(10);
    
    samples?.forEach((city, i) => {
      console.log(`   ${i+1}. ${city.city}, ${city.state_or_province} (ZIP: ${city.zip}, KMA: ${city.kma_code})`);
    });
    
  } catch (error) {
    console.error('❌ Error cleaning cities:', error);
  }
}

cleanCityDuplicates();
