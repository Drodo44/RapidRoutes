/**
 * Verified Intelligent Crawl System
 * 
 * This wraps the working intelligent system with HERE.com verification
 * to prevent invalid cities from being posted to DAT, which causes
 * posting errors and lane rejections.
 */

import { generateDefinitiveIntelligentPairs } from './definitiveIntelligent.js';
import { verifyCityWithHERE } from './hereVerificationService.js';
import { adminSupabase as supabase } from '../utils/supabaseClient.js';

/**
 * Verify a single city and return replacement if invalid
 */
async function verifyAndReplaceCityIfNeeded(city, state, zip, type = 'pickup', baseCity, usedCities = new Set()) {
  console.log(`🔍 Verifying ${type}: ${city}, ${state}`);
  
  // Try to verify the city with HERE.com
  const verification = await verifyCityWithHERE(city, state, zip, 'lane_generation', 'system');
  
  if (verification.verified) {
    console.log(`✅ ${city}, ${state} verified by HERE.com`);
    return { city, state, zip, verified: true, replacement: false };
  }
  
  console.warn(`❌ ${city}, ${state} FAILED HERE.com verification - finding replacement`);
  
  // City failed verification - find a verified replacement
  const replacement = await findVerifiedReplacement(city, state, type, baseCity, usedCities);
  
  if (replacement) {
    console.log(`🔄 Replacement found: ${replacement.city}, ${replacement.state}`);
    return { 
      city: replacement.city, 
      state: replacement.state, 
      zip: replacement.zip || '', 
      verified: true, 
      replacement: true,
      originalCity: `${city}, ${state}`
    };
  }
  
  // No replacement found - use original but flag it
  console.warn(`⚠️ No verified replacement found for ${city}, ${state} - using original (may cause DAT posting errors)`);
  return { city, state, zip, verified: false, replacement: false };
}

/**
 * Find a verified replacement city within the same region
 */
async function findVerifiedReplacement(originalCity, originalState, type, baseCity, usedCities) {
  console.log(`🔍 Finding verified replacement for ${originalCity}, ${originalState}`);
  
  const searchRadius = type === 'pickup' ? 100 : 100; // miles
  
  try {
    // Get potential replacements from database
    const { data: candidates } = await supabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude, kma_code')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .not('kma_code', 'is', null)
      .neq('city', originalCity) // Don't get the same city
      .ilike('state_or_province', originalState) // Prefer same state
      .limit(20);
    
    if (!candidates?.length) {
      console.warn(`❌ No replacement candidates found for ${originalCity}, ${originalState}`);
      return null;
    }
    
    // Try to verify candidates one by one
    for (const candidate of candidates) {
      const cityKey = `${candidate.city}_${candidate.state_or_province}`;
      
      // Skip if already used
      if (usedCities.has(cityKey)) {
        continue;
      }
      
      // Try to verify this candidate
      const verification = await verifyCityWithHERE(
        candidate.city, 
        candidate.state_or_province, 
        candidate.zip, 
        'replacement_search', 
        'system'
      );
      
      if (verification.verified) {
        usedCities.add(cityKey);
        return {
          city: candidate.city,
          state: candidate.state_or_province,
          zip: candidate.zip || ''
        };
      }
    }
    
    console.warn(`❌ No verified replacements found for ${originalCity}, ${originalState}`);
    return null;
    
  } catch (error) {
    console.error(`❌ Error finding replacement for ${originalCity}, ${originalState}:`, error);
    return null;
  }
}

/**
 * Generate verified intelligent pairs
 * 
 * This function:
 * 1. Uses the working intelligent system to generate pairs
 * 2. Verifies each city with HERE.com
 * 3. Replaces invalid cities with verified alternatives
 * 4. Maintains guaranteed row count
 */
export async function generateVerifiedIntelligentPairs(params) {
  console.log(`🛡️ VERIFIED INTELLIGENT SYSTEM: Adding HERE.com verification to prevent DAT posting errors`);
  
  // Check if HERE API is configured
  const hereApiKey = process.env.HERE_API_KEY;
  if (!hereApiKey) {
    console.log(`⚠️ HERE_API_KEY not configured - falling back to unverified intelligent system`);
    return await generateDefinitiveIntelligentPairs(params);
  }
  
  try {
    // Step 1: Use the working intelligent system
    const intelligentResult = await generateDefinitiveIntelligentPairs(params);
    
    if (!intelligentResult.pairs || intelligentResult.pairs.length === 0) {
      console.warn(`⚠️ No intelligent pairs generated - returning unverified result`);
      return intelligentResult;
    }
    
    console.log(`📊 Intelligent system generated ${intelligentResult.pairs.length} pairs - now verifying with HERE.com`);
    
    // Step 2: Verify base cities
    const baseOriginVerification = await verifyAndReplaceCityIfNeeded(
      intelligentResult.baseOrigin.city,
      intelligentResult.baseOrigin.state,
      intelligentResult.baseOrigin.zip,
      'base_origin',
      null,
      intelligentResult.usedCities
    );
    
    const baseDestVerification = await verifyAndReplaceCityIfNeeded(
      intelligentResult.baseDest.city,
      intelligentResult.baseDest.state,
      intelligentResult.baseDest.zip,
      'base_dest',
      null,
      intelligentResult.usedCities
    );
    
    // Step 3: Verify and potentially replace cities in pairs
    const verifiedPairs = [];
    
    for (let i = 0; i < intelligentResult.pairs.length; i++) {
      const pair = intelligentResult.pairs[i];
      console.log(`🔍 Verifying pair ${i + 1}/${intelligentResult.pairs.length}`);
      
      // Verify pickup city
      const verifiedPickup = await verifyAndReplaceCityIfNeeded(
        pair.pickup.city,
        pair.pickup.state,
        pair.pickup.zip,
        'pickup',
        intelligentResult.baseOrigin,
        intelligentResult.usedCities
      );
      
      // Verify delivery city  
      const verifiedDelivery = await verifyAndReplaceCityIfNeeded(
        pair.delivery.city,
        pair.delivery.state,
        pair.delivery.zip,
        'delivery',
        intelligentResult.baseDest,
        intelligentResult.usedCities
      );
      
      // Create verified pair
      const verifiedPair = {
        ...pair,
        pickup: {
          city: verifiedPickup.city,
          state: verifiedPickup.state,
          zip: verifiedPickup.zip,
        },
        delivery: {
          city: verifiedDelivery.city,
          state: verifiedDelivery.state,
          zip: verifiedDelivery.zip,
        },
        verification: {
          pickup: {
            verified: verifiedPickup.verified,
            replacement: verifiedPickup.replacement,
            originalCity: verifiedPickup.originalCity
          },
          delivery: {
            verified: verifiedDelivery.verified,
            replacement: verifiedDelivery.replacement,
            originalCity: verifiedDelivery.originalCity
          }
        }
      };
      
      verifiedPairs.push(verifiedPair);
    }
    
    // Step 4: Return verified result
    const verificationStats = {
      totalCities: (verifiedPairs.length * 2) + 2, // pairs * 2 + base cities
      verifiedCities: verifiedPairs.reduce((count, pair) => {
        return count + 
          (pair.verification.pickup.verified ? 1 : 0) + 
          (pair.verification.delivery.verified ? 1 : 0);
      }, (baseOriginVerification.verified ? 1 : 0) + (baseDestVerification.verified ? 1 : 0)),
      replacements: verifiedPairs.reduce((count, pair) => {
        return count +
          (pair.verification.pickup.replacement ? 1 : 0) +
          (pair.verification.delivery.replacement ? 1 : 0);
      }, (baseOriginVerification.replacement ? 1 : 0) + (baseDestVerification.replacement ? 1 : 0))
    };
    
    console.log(`🛡️ VERIFICATION COMPLETE:`);
    console.log(`   📊 Total cities processed: ${verificationStats.totalCities}`);
    console.log(`   ✅ Cities verified: ${verificationStats.verifiedCities}`);
    console.log(`   🔄 Replacements made: ${verificationStats.replacements}`);
    console.log(`   📈 Verification rate: ${(verificationStats.verifiedCities / verificationStats.totalCities * 100).toFixed(1)}%`);
    
    return {
      baseOrigin: {
        city: baseOriginVerification.city,
        state: baseOriginVerification.state,
        zip: baseOriginVerification.zip,
      },
      baseDest: {
        city: baseDestVerification.city,
        state: baseDestVerification.state,
        zip: baseDestVerification.zip,
      },
      pairs: verifiedPairs,
      usedCities: intelligentResult.usedCities,
      verification: verificationStats
    };
    
  } catch (error) {
    console.error(`❌ Verified intelligent system failed:`, error);
    
    // Fallback to unverified intelligent system
    console.log(`🔄 Falling back to unverified intelligent system`);
    return await generateDefinitiveIntelligentPairs(params);
  }
}
