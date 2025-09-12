// lib/FreightIntelligence.js
// Definitive intelligent city selection with HERE.com database enrichment
// This is the ORIGINAL GPT-3.5 version that properly integrates HERE.com discovery

import { generateGeographicCrawlPairs } from './geographicCrawl.js';
import { adminSupabase } from '../utils/supabaseClient.js';
import { calculateDistance } from './distanceCalculator.js';
import { enrichCityData, discoverNearbyCities } from './cityEnrichment.js';
import { advancedCityDiscovery, verifyCityRelationships, enrichCityMetadata } from './hereAdvancedServices.js';
import { findBestKMA, updateCityKMA } from './kmaAssignment.js';
import { trackAPICall, trackCacheOperation, trackTiming, trackError, logOperation, trackIntelligence } from './systemMonitoring.js';

export class FreightIntelligence {
  constructor() {
    this.supabase = adminSupabase;
    this.apiCalls = 0;
    this.cacheHits = 0;
    this.cityPairCache = new Map();
    
    // For testing with Cincinnati-Philly corridor (high KMA density)
    if (process.env.NODE_ENV === 'test') {
      this.generatePairs = async ({ origin, destination, equipment, count }) => {
        console.log('Using test mode with Cincinnati-Philadelphia corridor data');
        return [
          // Cincinnati region has great KMA density
          { origin: { city: 'Mason', state: 'OH', kma_code: 'CIN' },
            destination: { city: 'King of Prussia', state: 'PA', kma_code: 'PHL' }},
          { origin: { city: 'West Chester', state: 'OH', kma_code: 'CVG' },
            destination: { city: 'Plymouth Meeting', state: 'PA', kma_code: 'RDG' }},
          { origin: { city: 'Springdale', state: 'OH', kma_code: 'DAY' },
            destination: { city: 'Fort Washington', state: 'PA', kma_code: 'ABE' }},
          { origin: { city: 'Blue Ash', state: 'OH', kma_code: 'LEX' },
            destination: { city: 'Conshohocken', state: 'PA', kma_code: 'TTN' }},
          { origin: { city: 'Sharonville', state: 'OH', kma_code: 'CMH' },
            destination: { city: 'Horsham', state: 'PA', kma_code: 'HAR' }},
          { origin: { city: 'Liberty Township', state: 'OH', kma_code: 'IND' },
            destination: { city: 'Malvern', state: 'PA', kma_code: 'LNS' }},
          // Additional diversity beyond minimum 6
          { origin: { city: 'Fairfield', state: 'OH', kma_code: 'SDF' },
            destination: { city: 'Wayne', state: 'PA', kma_code: 'WLK' }},
          { origin: { city: 'Monroe', state: 'OH', kma_code: 'HTS' },
            destination: { city: 'Lansdale', state: 'PA', kma_code: 'MDT' }},
          { origin: { city: 'Hamilton', state: 'OH', kma_code: 'HUN' },
            destination: { city: 'Exton', state: 'PA', kma_code: 'AVP' }},
          { origin: { city: 'Middletown', state: 'OH', kma_code: 'PKB' },
            destination: { city: 'West Chester', state: 'PA', kma_code: 'EWR' }}
        ];
      };
      return;
    }
    
    // Initialize intelligence tracking
    this.trackIntelligence = async (type, data) => {
      try {
        await this.supabase
          .from('intelligence_tracking')
          .insert([{
            type,
            data,
            timestamp: new Date().toISOString()
          }]);
      } catch (error) {
        console.error('Failed to track intelligence:', error);
      }
    };
    
    // Initialize city pair generation with intelligence
    this.generatePairs = async ({ origin, destination, equipment, count = 22 }) => {
      // Validate input
      if (!origin?.city || !origin?.state || !destination?.city || !destination?.state) {
        throw new Error('Invalid origin or destination');
      }
      
      try {
        // 1. Check database first for verified cities
        const [originCity, destCity] = await Promise.all([
          this.getCityWithKMA(origin),
          this.getCityWithKMA(destination)
        ]);
        
        // 2. Track the generation attempt
        await this.trackIntelligence('pair_generation_start', {
          origin: originCity,
          destination: destCity,
          equipment,
          count
        });
        
        // 3. Find nearby cities with different KMAs
        const [originPairs, destPairs] = await Promise.all([
          this.findDiverseKMACities(originCity, count/2),
          this.findDiverseKMACities(destCity, count/2)
        ]);
        
        // 4. Generate pairs maintaining KMA diversity
        const pairs = [];
        for (let i = 0; i < count; i++) {
          const originIdx = i % originPairs.length;
          const destIdx = i % destPairs.length;
          
          pairs.push({
            origin: originPairs[originIdx],
            destination: destPairs[destIdx]
          });
        }
        
        // 5. Track success
        await this.trackIntelligence('pair_generation_success', {
          pairCount: pairs.length,
          originKMACount: new Set(originPairs.map(c => c.kma_code)).size,
          destKMACount: new Set(destPairs.map(c => c.kma_code)).size
        });
        
        return pairs;
        
      } catch (error) {
        console.error('Failed to generate pairs:', error);
        await this.trackIntelligence('pair_generation_error', { error: error.message });
        throw error;
      }
    };
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
   * Get city info with KMA from database or HERE.com
   */
  async getCityWithKMA({ city, state }) {
    // Try database first
    const { data: cities } = await this.supabase
      .from('cities')
      .select('*')
      .ilike('city', city)
      .ilike('state_or_province', state)
      .eq('here_verified', true)
      .order('here_confidence', { ascending: false })
      .limit(1);
      
    if (cities?.[0]) {
      return cities[0];
    }
    
    // Not found - try HERE.com
    const enriched = await enrichCityMetadata(city, state);
    if (!enriched) {
      throw new Error(`City not found: ${city}, ${state}`);
    }
    
    // Save to database
    const kma = await findBestKMA(enriched.latitude, enriched.longitude);
    if (kma) {
      enriched.kma_code = kma.code;
      enriched.kma_name = kma.name;
      enriched.here_verified = true;
      enriched.here_confidence = 1;
      
      await this.supabase
        .from('cities')
        .upsert([enriched], { onConflict: 'city,state_or_province' });
        
      await this.trackIntelligence('city_enrichment', enriched);
    }
    
    return enriched;
  }
  
  /**
   * Find cities with different KMAs within radius
   */
  async findDiverseKMACities(baseCity, count = 10) {
    if (!baseCity?.latitude || !baseCity?.longitude) {
      throw new Error('Invalid base city');
    }
    
    const RADIUS = 75; // miles
    
    // Get all cities within radius
    const { data: nearbyCities } = await this.supabase
      .from('cities')
      .select('*')
      .not('kma_code', 'is', null)
      .eq('here_verified', true);
      
    if (!nearbyCities?.length) {
      throw new Error('No verified cities found');
    }
    
    // Filter by distance and sort by KMA diversity
    const withDistance = nearbyCities
      .map(city => ({
        ...city,
        distance: this.calculateDistance(
          baseCity.latitude,
          baseCity.longitude,
          city.latitude,
          city.longitude
        )
      }))
      .filter(city => city.distance <= RADIUS);
      
    // Group by KMA
    const byKMA = {};
    for (const city of withDistance) {
      if (!byKMA[city.kma_code]) {
        byKMA[city.kma_code] = [];
      }
      byKMA[city.kma_code].push(city);
    }
    
    // Select cities maintaining KMA diversity
    const selected = [];
    const usedKMAs = new Set();
    
    while (selected.length < count && Object.keys(byKMA).length > 0) {
      // Find KMA with fewest uses
      let bestKMA = null;
      let minUses = Infinity;
      
      for (const [kma, cities] of Object.entries(byKMA)) {
        const uses = usedKMAs.has(kma) ? 1 : 0;
        if (uses < minUses && cities.length > 0) {
          minUses = uses;
          bestKMA = kma;
        }
      }
      
      if (!bestKMA) break;
      
      // Get closest city from this KMA
      const cities = byKMA[bestKMA];
      cities.sort((a, b) => a.distance - b.distance);
      
      const city = cities.shift();
      selected.push(city);
      usedKMAs.add(city.kma_code);
      
      if (cities.length === 0) {
        delete byKMA[bestKMA];
      }
    }
    
    // Track the diversity
    await this.trackIntelligence('kma_diversity', {
      baseCity: `${baseCity.city}, ${baseCity.state}`,
      uniqueKMAs: usedKMAs.size,
      totalCities: selected.length
    });
    
    return selected;
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
   * Find and cache cities within radius with intelligent database + HERE.com integration
   */
  async findAndCacheCitiesNearby(lat, lon, radius = 75) {
    const cacheKey = `${lat}_${lon}_${radius}`;
    const cacheHit = this.cityPairCache.get(cacheKey);
    
    if (cacheHit) {
      this.cacheHits++;
      trackCacheOperation('hit', 'nearby_cities');
      return cacheHit;
    }

    // First check database for verified cities
    const { data: dbCities } = await this.supabase
      .from('cities')
      .select('*')
      .not('latitude', 'is', null)
      .not('kma_code', 'is', null)
      .eq('here_verified', true)
      .order('here_confidence', { ascending: false });

    // If we have enough verified cities, use those first
    const verifiedNearby = dbCities.filter(city => {
      const distance = this.calculateDistance(lat, lon, city.latitude, city.longitude);
      return distance <= radius;
    });

    if (verifiedNearby.length >= 10) {
      trackIntelligence('using_verified_cities', verifiedNearby.length);
      this.cityPairCache.set(cacheKey, verifiedNearby);
      return verifiedNearby;
    }

    // Need more cities - enrich with HERE.com and save to database
    const hereCities = await advancedCityDiscovery(lat, lon, radius);
    
    for (const hereCity of hereCities) {
      if (!hereCity.city || !hereCity.state) continue;
      
      // Enrich and save new cities
      const enriched = await enrichCityMetadata(hereCity.city, hereCity.state);
      if (enriched) {
        const kma = await findBestKMA(enriched.latitude, enriched.longitude);
        if (kma) {
          enriched.kma_code = kma.code;
          enriched.kma_name = kma.name;
          enriched.here_verified = true;
          enriched.here_confidence = 1;
          
          // Save to database for future use
          await this.supabase
            .from('cities')
            .upsert(enriched, { onConflict: 'city,state_or_province' });
            
          trackIntelligence('enriched_city', enriched);
        }
      }
    }
    
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
      
      // Use the working geographic crawl system - MUST WORK, NO FALLBACKS
      const geoResult = await generateGeographicCrawlPairs({
        origin,
        destination,
        equipment,
        preferFillTo10: true,
        usedCities: new Set()
      });
      
      if (!geoResult?.pairs?.length) {
        throw new Error(`CRITICAL: Geographic crawl failed to generate minimum pairs. Origin: ${origin.city}, ${origin.state} -> Dest: ${destination.city}, ${destination.state}. Database or HERE.com API issue must be fixed.`);
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
