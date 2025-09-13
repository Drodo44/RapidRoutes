// lib/intelligentCache.js
// Smart caching system for intelligent city pairs with fallback to generation

import { adminSupabase } from '../utils/supabaseClient.js';
import { FreightIntelligence } from './FreightIntelligence.js';
import { monitor } from './monitor.js';

class IntelligentCache {
  constructor() {
    this.intelligence = new FreightIntelligence();
  }

  /**
   * Generate a cache key for a route
   */
  generateRouteKey(origin, destination, equipment) {
    return `${origin.city}_${origin.state}_${destination.city}_${destination.state}_${equipment}`;
  }

  /**
   * Look for cached intelligent pairs for this route
   * First checks recent successful lanes, then stored cache table
   */
  async getCachedPairs(origin, destination, equipment) {
    const routeKey = this.generateRouteKey(origin, destination, equipment);
    
    try {
      // First: Look for recent successful lanes with this exact route
      const { data: recentLanes, error: laneError } = await adminSupabase
        .from('lanes')
        .select('id, created_at')
        .eq('origin_city', origin.city)
        .eq('origin_state', origin.state)
        .eq('dest_city', destination.city)
        .eq('dest_state', destination.state)
        .eq('equipment_code', equipment)
        .eq('status', 'covered') // Only successful lanes
        .order('created_at', { ascending: false })
        .limit(1);

      if (laneError) {
        console.warn('Lane cache lookup failed:', laneError);
      }

      // If we found a recent successful lane, try to get its performance data
      if (recentLanes && recentLanes.length > 0) {
        const recentLane = recentLanes[0];
        const { data: performanceData, error: perfError } = await adminSupabase
          .from('lane_performance')
          .select('crawl_cities')
          .eq('lane_id', recentLane.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!perfError && performanceData && performanceData.length > 0) {
          const crawlCities = performanceData[0].crawl_cities;
          if (Array.isArray(crawlCities) && crawlCities.length >= 6) {
            console.log(`📋 Cache HIT: Found ${crawlCities.length} cached pairs for route ${routeKey}`);
            
            // Convert crawl_cities format to pairs format
            const pairs = crawlCities.map(crawl => ({
              pickup: {
                city: crawl.pickup.city,
                state: crawl.pickup.state,
                kma_code: crawl.pickup.kma_code
              },
              delivery: {
                city: crawl.delivery.city,
                state: crawl.delivery.state,
                kma_code: crawl.delivery.kma_code
              },
              score: crawl.score || 0.8,
              cached: true,
              source: 'recent_successful_lane'
            }));

            return { pairs, cached: true, source: 'recent_successful_lane' };
          }
        }
      }

      // Second: Check if we have a dedicated cache table (for future enhancement)
      // TODO: Implement dedicated intelligent_pairs_cache table if needed

      console.log(`📋 Cache MISS: No cached pairs found for route ${routeKey}`);
      return { pairs: [], cached: false, source: null };

    } catch (error) {
      console.warn('Cache lookup error:', error);
      return { pairs: [], cached: false, source: null };
    }
  }

  /**
   * Generate fresh intelligent pairs and cache them
   */
  async generateAndCachePairs(origin, destination, equipment, laneId = null) {
    const routeKey = this.generateRouteKey(origin, destination, equipment);
    
    try {
      console.log(`🧠 Generating fresh intelligence for route ${routeKey}`);
      
      const result = await this.intelligence.generateDiversePairs({
        origin,
        destination,
        equipment,
        minimumPairs: 6 // Generate minimum 6, no maximum constraint
      });

      const pairs = Array.isArray(result?.pairs) ? result.pairs : [];
      
      if (pairs.length < 6) {
        console.warn(`⚠️ Generated only ${pairs.length} pairs for route ${routeKey}, minimum is 6`);
      } else {
        console.log(`✅ Generated ${pairs.length} intelligent pairs for route ${routeKey}`);
      }

      // Cache the results if we have a lane_id (via lane_performance table)
      if (laneId && pairs.length > 0) {
        await this.cachePairs(laneId, pairs);
      }

      return { 
        pairs, 
        cached: false, 
        source: 'fresh_generation',
        generatedCount: pairs.length 
      };

    } catch (error) {
      console.error(`❌ Failed to generate intelligence for route ${routeKey}:`, error);
      throw error;
    }
  }

  /**
   * Cache pairs to lane_performance table for future lookup
   */
  async cachePairs(laneId, pairs) {
    try {
      const crawlCitiesPayload = pairs.map(p => ({
        pickup: {
          city: p.pickup.city,
          state: p.pickup.state_or_province || p.pickup.state,
          kma_code: p.pickup.kma_code || null
        },
        delivery: {
          city: p.delivery.city,
          state: p.delivery.state_or_province || p.delivery.state,
          kma_code: p.delivery.kma_code || null
        },
        score: Number(p.score || 0.5)
      }));

      const { error } = await adminSupabase
        .from('lane_performance')
        .insert({
          lane_id: laneId,
          crawl_cities: crawlCitiesPayload,
          intelligence_metadata: {
            cached_at: new Date().toISOString(),
            pair_count: pairs.length,
            cache_source: 'fresh_generation'
          }
        });

      if (error) {
        console.warn('Failed to cache pairs:', error);
      } else {
        console.log(`💾 Cached ${pairs.length} pairs for lane ${laneId}`);
      }
    } catch (error) {
      console.warn('Cache storage error:', error);
    }
  }

  /**
   * Generate basic geographic pairs as fallback
   */
  async generateBasicPairs(origin, destination, equipment) {
    try {
      console.log(`🌍 Generating basic geographic pairs as fallback`);
      
      const { generateGeographicCrawlPairs } = await import('./geographicCrawl.js');
      
      const result = await generateGeographicCrawlPairs({
        origin,
        destination,
        equipment,
        minimumPairs: 6 // Generate minimum 6, no maximum constraint
      });

      const pairs = Array.isArray(result?.pairs) ? result.pairs : [];
      console.log(`🌍 Generated ${pairs.length} basic geographic pairs`);
      
      return {
        pairs,
        cached: false,
        source: 'basic_geographic',
        generatedCount: pairs.length
      };

    } catch (error) {
      console.error('Basic pair generation failed:', error);
      return {
        pairs: [],
        cached: false,
        source: 'failed_basic',
        error: error.message
      };
    }
  }

  /**
   * Get intelligent pairs with smart caching and fallbacks
   * A: Try cache first (fast)
   * B: Generate fresh intelligence if cache miss or insufficient pairs
   * C: Fall back to basic geographic pairs if intelligence fails
   */
  async getIntelligentPairs(origin, destination, equipment, laneId = null) {
    const routeKey = this.generateRouteKey(origin, destination, equipment);
    
    try {
      // A: Try cache first
      const cachedResult = await this.getCachedPairs(origin, destination, equipment);
      
      if (cachedResult.cached && cachedResult.pairs.length >= 6) {
        console.log(`🎯 Using ${cachedResult.pairs.length} cached pairs for ${routeKey}`);
        return cachedResult;
      }

      // B: Cache miss or insufficient pairs - generate fresh intelligence
      console.log(`🔄 Cache miss or insufficient pairs (${cachedResult.pairs.length}), generating fresh for ${routeKey}`);
      
      try {
        const freshResult = await this.generateAndCachePairs(origin, destination, equipment, laneId);
        
        if (freshResult.pairs.length >= 6) {
          return freshResult;
        } else {
          console.warn(`⚠️ Intelligence generated only ${freshResult.pairs.length} pairs, trying fallback`);
        }
      } catch (intelligenceError) {
        console.warn(`⚠️ Intelligence generation failed, trying fallback:`, intelligenceError.message);
      }

      // C: Fall back to basic geographic pairs
      console.log(`🌍 Falling back to basic geographic pairs for ${routeKey}`);
      const basicResult = await this.generateBasicPairs(origin, destination, equipment);
      
      return basicResult;

    } catch (error) {
      console.error(`❌ All pair generation methods failed for route ${routeKey}:`, error);
      
      // Final fallback: Return empty array
      return { 
        pairs: [], 
        cached: false, 
        source: 'complete_failure', 
        error: error.message 
      };
    }
  }
}

// Export singleton instance
export const intelligentCache = new IntelligentCache();
export { IntelligentCache };
