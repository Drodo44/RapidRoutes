import { adminSupabase } from './utils/supabaseClient.js';

async function cleanCitiesSimple() {
  console.log('🧹 Simple city deduplication approach...');
  
  try {
    // Get all cities with no limit
    console.log('📥 Fetching all cities from database...');
    let allCities = [];
    let from = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data, error } = await adminSupabase
        .from('cities')
        .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .not('kma_code', 'is', null)
        .range(from, from + pageSize - 1);
      
      if (error) {
        console.error('❌ Error fetching cities:', error);
        break;
      }
      
      if (!data || data.length === 0) break;
      
      allCities = allCities.concat(data);
      from += pageSize;
      console.log(`   Fetched ${allCities.length} cities...`);
      
      if (data.length < pageSize) break; // Last page
    }
    
    console.log(`📊 Total cities fetched: ${allCities.length}`);
    
    // Deduplicate
    console.log('🎯 Deduplicating cities...');
    const cityMap = new Map();
    
    // Filter out any entries with null/undefined city or state, then sort
    const validCities = allCities.filter(city => 
      city.city && city.state_or_province && 
      typeof city.city === 'string' && typeof city.state_or_province === 'string'
    );
    
    console.log(`📊 Valid cities after filtering: ${validCities.length}`);
    
    validCities.sort((a, b) => {
      const aKey = `${a.city.toLowerCase()}, ${a.state_or_province.toLowerCase()}`;
      const bKey = `${b.city.toLowerCase()}, ${b.state_or_province.toLowerCase()}`;
      if (aKey !== bKey) return aKey.localeCompare(bKey);
      return (a.zip || '').localeCompare(b.zip || '');
    });
    
    for (const city of validCities) {
      const key = `${city.city.toLowerCase()}, ${city.state_or_province.toLowerCase()}`;
      if (!cityMap.has(key)) {
        cityMap.set(key, city);
      }
    }
    
    const uniqueCities = Array.from(cityMap.values());
    console.log(`✨ Deduplicated to ${uniqueCities.length} unique cities`);
    console.log(`💾 Eliminated ${allCities.length - uniqueCities.length} duplicates`);
    
    // Instead of creating a new table, let's update the existing approach
    // Save the clean data to a JSON file for now, then we can decide how to apply it
    const fs = await import('fs');
    const cleanData = {
      original_count: allCities.length,
      valid_count: validCities.length,
      unique_count: uniqueCities.length,
      duplicates_removed: validCities.length - uniqueCities.length,
      cities: uniqueCities
    };
    
    fs.writeFileSync('cities_clean_data.json', JSON.stringify(cleanData, null, 2));
    console.log('💾 Clean data saved to cities_clean_data.json');
    
    // Show some examples of what was deduplicated
    console.log('\n📋 Sample deduplicated cities:');
    uniqueCities.slice(0, 20).forEach((city, i) => {
      console.log(`   ${i+1}. ${city.city}, ${city.state_or_province} (ZIP: ${city.zip}, KMA: ${city.kma_code})`);
    });
    
    // Check if Maplesville is in there
    const maplesville = uniqueCities.find(c => 
      c.city.toLowerCase() === 'maplesville' && 
      c.state_or_province.toLowerCase() === 'al'
    );
    
    if (maplesville) {
      console.log(`\n🎯 Found Maplesville, AL: ZIP ${maplesville.zip}, KMA ${maplesville.kma_code}`);
    } else {
      console.log('\n❌ Maplesville, AL not found in clean data');
    }
    
    console.log('\n✅ DEDUPLICATION COMPLETE');
    console.log(`📊 SUMMARY:`);
    console.log(`   Original entries: ${allCities.length}`);
    console.log(`   Valid entries: ${validCities.length}`);
    console.log(`   Unique cities: ${uniqueCities.length}`);
    console.log(`   Duplicates removed: ${validCities.length - uniqueCities.length}`);
    console.log('   Next step: Apply this clean data to your database');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

cleanCitiesSimple();
