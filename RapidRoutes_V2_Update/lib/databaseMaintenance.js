/**
 * Database Cleanup and Maintenance Tools
 * Ensures data quality and consistency
 */

import supabaseAdmin from '@/lib/supabaseAdmin';
const adminSupabase = supabaseAdmin;
import { verifyCityWithHERE } from './hereVerificationService.js';
import { findBestKMA } from './kmaAssignment.js';
import { logOperation } from './systemMonitoring.js';

/**
 * Clean and normalize city data
 */
async function normalizeCity(city) {
  // Remove unwanted characters and normalize spacing
  const normalized = {
    city: city.city
      .replace(/[^\w\s-]/g, '') // Remove special chars except hyphen
      .replace(/\s+/g, ' ')     // Normalize spaces
      .trim()
      .toUpperCase(),
    state_or_province: city.state_or_province
      .replace(/[^\w\s]/g, '')
      .trim()
      .toUpperCase(),
    zip: city.zip?.replace(/[^\d]/g, '') || null
  };
  
  return {
    ...city,
    ...normalized
  };
}

/**
 * Find and merge duplicate cities
 */
export async function findDuplicates() {
  console.log('🔍 Searching for duplicate cities...');
  
  const { data: cities, error } = await supabaseAdmin
    .from('cities')
    .select('*');
    
  if (error) throw error;
  
  const duplicates = new Map();
  const normalized = new Map();
  
  // Find duplicates
  for (const city of cities) {
    const key = `${city.city.toUpperCase()}_${city.state_or_province.toUpperCase()}`;
    
    if (!normalized.has(key)) {
      normalized.set(key, []);
    }
    normalized.get(key).push(city);
    
    if (normalized.get(key).length > 1) {
      duplicates.set(key, normalized.get(key));
    }
  }
  
  return duplicates;
}

/**
 * Merge duplicate cities
 */
export async function mergeDuplicates() {
  const duplicates = await findDuplicates();
  const results = {
    found: duplicates.size,
    merged: 0,
    errors: []
  };
  
  for (const [key, cities] of duplicates) {
    try {
      // Sort by data quality
      const sorted = cities.sort((a, b) => {
        let scoreA = 0, scoreB = 0;
        
        // Prefer cities with more data
        if (a.latitude && a.longitude) scoreA += 2;
        if (b.latitude && b.longitude) scoreB += 2;
        
        if (a.kma_code) scoreA += 2;
        if (b.kma_code) scoreB += 2;
        
        if (a.here_verified) scoreA += 3;
        if (b.here_verified) scoreB += 3;
        
        if (a.zip) scoreA += 1;
        if (b.zip) scoreB += 1;
        
        return scoreB - scoreA;
      });
      
      const primary = sorted[0];
      const duplicates = sorted.slice(1);
      
      // Merge data into primary record
      const mergedData = {
        ...primary,
        merged_count: duplicates.length,
        merged_ids: duplicates.map(d => d.id),
        last_merged: new Date().toISOString()
      };
      
      // Update primary record
      const { error: updateError } = await supabaseAdmin
        .from('cities')
        .update(mergedData)
        .eq('id', primary.id);
        
      if (updateError) throw updateError;
      
      // Move duplicates to archive
      for (const dupe of duplicates) {
        const { error: archiveError } = await supabaseAdmin
          .from('archived_cities')
          .insert({
            ...dupe,
            archived_reason: 'duplicate_merged',
            primary_city_id: primary.id,
            archived_at: new Date().toISOString()
          });
          
        if (archiveError) throw archiveError;
        
        // Delete duplicate
        const { error: deleteError } = await supabaseAdmin
          .from('cities')
          .delete()
          .eq('id', dupe.id);
          
        if (deleteError) throw deleteError;
      }
      
      results.merged++;
      
      await logOperation('merge_duplicates', {
        primary_city: `${primary.city}, ${primary.state_or_province}`,
        merged_count: duplicates.length
      });
      
    } catch (error) {
      console.error(`Failed to merge ${key}:`, error);
      results.errors.push({
        key,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Clean and verify city data
 */
export async function cleanCityData(options = {}) {
  const {
    verifyWithHERE = true,
    assignKMA = true,
    batchSize = 50,
    maxRetries = 3
  } = options;
  
  const results = {
    total: 0,
    normalized: 0,
    verified: 0,
    kma_assigned: 0,
    errors: []
  };
  
  try {
    // Get all cities
    const { data: cities, error } = await supabaseAdmin
      .from('cities')
      .select('*');
      
    if (error) throw error;
    
    results.total = cities.length;
    
    // Process in batches
    for (let i = 0; i < cities.length; i += batchSize) {
      const batch = cities.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(cities.length/batchSize)}`);
      
      for (const city of batch) {
        try {
          // Normalize data
          const normalized = await normalizeCity(city);
          results.normalized++;
          
          // HERE.com verification
          if (verifyWithHERE) {
            let retries = 0;
            let verified = false;
            
            while (retries < maxRetries && !verified) {
              try {
                const verification = await verifyCityWithHERE(
                  normalized.city,
                  normalized.state_or_province,
                  normalized.zip
                );
                
                if (verification.verified) {
                  normalized.here_verified = true;
                  normalized.here_data = verification.data;
                  normalized.last_verification = new Date().toISOString();
                  verified = true;
                  results.verified++;
                }
              } catch (error) {
                retries++;
                if (retries === maxRetries) {
                  throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * retries));
              }
            }
          }
          
          // KMA assignment
          if (assignKMA && !normalized.kma_code) {
            const kmaResult = await findBestKMA(normalized);
            if (kmaResult?.kma) {
              normalized.kma_code = kmaResult.kma.code;
              normalized.kma_name = kmaResult.kma.name;
              normalized.kma_confidence = kmaResult.confidence;
              results.kma_assigned++;
            }
          }
          
          // Update database
          const { error: updateError } = await supabaseAdmin
            .from('cities')
            .update(normalized)
            .eq('id', city.id);
            
          if (updateError) throw updateError;
          
        } catch (error) {
          console.error(`Failed to process ${city.city}, ${city.state_or_province}:`, error);
          results.errors.push({
            city: city.city,
            state: city.state_or_province,
            error: error.message
          });
        }
      }
      
      // Delay between batches
      if (i + batchSize < cities.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    await logOperation('clean_city_data', results);
    return results;
    
  } catch (error) {
    console.error('Failed to clean city data:', error);
    throw error;
  }
}

/**
 * Validate and repair database integrity
 */
export async function validateDatabaseIntegrity() {
  const results = {
    checks_performed: 0,
    issues_found: 0,
    issues_fixed: 0,
    repairs: []
  };
  
  try {
    // Check for missing required fields
    const requiredFields = ['city', 'state_or_province', 'latitude', 'longitude'];
    for (const field of requiredFields) {
      const { data: missing } = await supabaseAdmin
        .from('cities')
        .select('id, city, state_or_province')
        .or(`${field}.is.null,${field}.eq.''`);
        
      results.checks_performed++;
      
      if (missing?.length) {
        results.issues_found += missing.length;
        
        // Move invalid records to archive
        for (const record of missing) {
          try {
            await supabaseAdmin
              .from('archived_cities')
              .insert({
                ...record,
                archived_reason: `missing_${field}`,
                archived_at: new Date().toISOString()
              });
              
            await supabaseAdmin
              .from('cities')
              .delete()
              .eq('id', record.id);
              
            results.issues_fixed++;
            results.repairs.push({
              city: record.city,
              state: record.state_or_province,
              issue: `missing_${field}`,
              action: 'archived'
            });
          } catch (error) {
            console.error(`Failed to archive ${record.city}, ${record.state_or_province}:`, error);
          }
        }
      }
    }
    
    // Check for orphaned KMA references
    const { data: orphanedKMA } = await supabaseAdmin
      .from('cities')
      .select('id, city, state_or_province, kma_code')
      .not('kma_code', 'is', null);
      
    results.checks_performed++;
    
    if (orphanedKMA?.length) {
      for (const city of orphanedKMA) {
        const { data: kma } = await supabaseAdmin
          .from('kma_data')
          .select('code')
          .eq('code', city.kma_code)
          .single();
          
        if (!kma) {
          results.issues_found++;
          
          // Find new KMA
          const kmaResult = await findBestKMA(city);
          if (kmaResult?.kma) {
            await supabaseAdmin
              .from('cities')
              .update({
                kma_code: kmaResult.kma.code,
                kma_name: kmaResult.kma.name,
                kma_confidence: kmaResult.confidence
              })
              .eq('id', city.id);
              
            results.issues_fixed++;
            results.repairs.push({
              city: city.city,
              state: city.state_or_province,
              issue: 'orphaned_kma',
              action: 'reassigned'
            });
          }
        }
      }
    }
    
    await logOperation('validate_database', results);
    return results;
    
  } catch (error) {
    console.error('Database validation error:', error);
    throw error;
  }
}
