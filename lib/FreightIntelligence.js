// lib/FreightIntelligence.js
// Generates diverse pairs of cities using geographic crawl system

import { generateGeographicCrawlPairs } from './geographicCrawl.js';
import { adminSupabase } from '../utils/supabaseClient.js';
import { calculateDistance } from './distanceCalculator.js';
import { enrichCityData, discoverNearbyCities } from './cityEnrichment.js';
import { advancedCityDiscovery, verifyCityRelationships } from './hereAdvancedServices.js';
import { findBestKMA, updateCityKMA } from './kmaAssignment.js';
import { trackAPICall, trackCacheOperation, trackTiming, trackError, logOperation } from './systemMonitoring.js';

export class FreightIntelligence {
  constructor() {
    this.supabase = adminSupabase;
    this.apiCalls = 0;
    this.cacheHits = 0;
    this.cityPairCache = new Map();
  }

  /**
   * Generate city pair hash for consistent lookup
   */
  generateCityPairHash(originCity, originState, destCity, destState) {
    if (!originCity || !originState || !destCity || !destState) {
      throw new Error('Invalid city pair data');
    }
    return `${originCity.toUpperCase()}_${originState.toUpperCase()}_${destCity.toUpperCase()}_${destState.toUpperCase()}`;
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    if (![lat1, lon1, lat2, lon2].every(coord => 
      typeof coord === 'number' && !isNaN(coord))) {
      throw new Error('Invalid coordinates');
    }
    return calculateDistance(lat1, lon1, lat2, lon2);
  }

  /**
   * Find and cache cities within radius with rate limiting
   */
  async findAndCacheCitiesNearby(lat, lon, radius = 50) {
    // Respect rate limits
    await new Promise(resolve => setTimeout(resolve, 100));

    this.apiCalls += 5; // Increment API calls by 5 for each operation
    const cacheKey = `${lat}_${lon}_${radius}`;
    
    if (this.cityPairCache.has(cacheKey)) {
      this.cacheHits++;
      return this.cityPairCache.get(cacheKey);
    }

    try {
      const { data: cities, error } = await this.supabase
        .rpc('fetch_nearby_cities', { 
          i_lat: lat,
          i_lon: lon,
          i_radius_miles: radius
        });

      if (error) {
        console.error('RPC error finding nearby cities:', error);
        return [];
      }

      this.cityPairCache.set(cacheKey, cities || []);
      return cities || [];
    } catch (error) {
      console.error('Failed to find nearby cities:', error);
      return [];
    }
  }

  /**
   * Get current usage statistics
   */
  getUsageStats() {
    return {
      apiCalls: this.apiCalls,
      cacheHits: this.cacheHits,
      cacheSize: this.cityPairCache.size
    };
  }

  /**
   * Get current stats (alias for getUsageStats)
   */
  getStats() {
    return this.getUsageStats();
  }

  /**
   * Update usage tracking in database
   */
  async updateUsage(pairHash, equipment = 'V', usageCount = 1) {
    const MAX_RETRIES = 3;
    let retries = 0;

    while (retries < MAX_RETRIES) {
      try {
        await this.supabase
          .from('city_pair_usage')
          .upsert({ 
            pair_hash: pairHash,
            equipment_type: equipment,
            usage_count: usageCount
          });
        return [];
      } catch (error) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }
    return [];
  }
  
  /**
   * Generate diverse pairs using our geographic crawl
   * Always generates exactly 6 pairs per DAT spec
   */
  async generateDiversePairs({ origin, destination, equipment }) {
    const startTime = Date.now();
    console.log('🧠 FreightIntelligence: Starting pair generation...');
    
    try {
      // Early validation
      if (!origin?.city || !origin?.state) {
        throw new Error(`Invalid origin: city=${origin?.city}, state=${origin?.state}`);
      }
      if (!destination?.city || !destination?.state) {
        throw new Error(`Invalid destination: city=${destination?.city}, state=${destination?.state}`);
      }
      
      console.log(`📍 From: ${origin.city}, ${origin.state} To: ${destination.city}, ${destination.state}`);
      console.log(`� Equipment: ${equipment || 'Not specified'}`);
      
      // Use the working geographic crawl system directly
      let geoResult;
      try {
        geoResult = await generateGeographicCrawlPairs({
          origin,
          destination,
          equipment,
          preferFillTo10: true,
          usedCities: new Set()
        });
      } catch (geoError) {
        console.warn('🚨 Geographic crawl failed, using emergency fallback:', geoError.message);
        const { generateEmergencyPairs } = await import('./emergencyFallback.js');
        geoResult = await generateEmergencyPairs({ origin, destination, equipment });
      }
      
      if (!geoResult?.pairs?.length) {
        console.warn('🚨 All systems failed, generating minimal emergency pairs');
        const { generateEmergencyPairs } = await import('./emergencyFallback.js');
        geoResult = await generateEmergencyPairs({ origin, destination, equipment });
      }
      
      console.log(`✅ Generated ${geoResult.pairs.length} pairs`);
      console.log(`   Base: ${geoResult.baseOrigin.city}, ${geoResult.baseOrigin.state} -> ${geoResult.baseDest.city}, ${geoResult.baseDest.state}`);
      if (geoResult.kmaAnalysis) {
        console.log(`   Unique KMAs - Pickup: ${geoResult.kmaAnalysis.uniquePickupKmas}, Delivery: ${geoResult.kmaAnalysis.uniqueDeliveryKmas}`);
      }
      
      // Track usage
      const pairHash = this.generateCityPairHash(origin.city, origin.state, destination.city, destination.state);
      await this.updateUsage(pairHash, equipment);
      
      return geoResult;
      
    } catch (error) {
      console.error('❌ FREIGHT INTELLIGENCE ERROR:');
      console.error(`   Origin: ${origin?.city}, ${origin?.state}`);
      console.error(`   Dest: ${destination?.city}, ${destination?.state}`); 
      console.error(`   Equipment: ${equipment}`);
      console.error(`   Error: ${error.message}`);
      throw error;
    }
  }
}
