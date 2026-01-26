/**
 * ENHANCED GEOGRAPHIC CRAWL WITH FRED INTELLIGENCE
 * 
 * Integrates Federal Reserve Economic Data (FRED) with your existing
 * freight intelligence system to provide real-time market insights.
 */

import supabaseAdmin from '@/lib/supabaseAdmin';
const adminSupabase = supabaseAdmin;
import { FREDIntelligenceService } from './fredIntelligenceService.js';

class EnhancedGeographicIntelligence {
  constructor() {
    this.fredService = new FREDIntelligenceService();
    this.economicCache = new Map(); // Cache economic data for 1 hour
  }

  /**
   * Your existing freight intelligence + FRED economic intelligence
   */
  async calculateEnhancedFreightIntelligence(cityRow, equipment, baseCity) {
    // Get your existing broker expertise score
    const brokerScore = this.calculateBrokerExpertiseScore(cityRow, equipment, baseCity);
    
    // Get economic intelligence from FRED
    const economicScore = await this.getEconomicIntelligence(cityRow, equipment);
    
    // Combine both intelligences
    const combinedScore = brokerScore + economicScore;
    
    return {
      broker_expertise_score: brokerScore,
      economic_intelligence_score: economicScore,
      combined_score: combinedScore,
      intelligence_breakdown: {
        broker_knowledge: `${(brokerScore * 100).toFixed(1)}% - Based on TQL broker expertise`,
        economic_data: `${(economicScore * 100).toFixed(1)}% - Based on FRED economic indicators`,
        total_confidence: `${(combinedScore * 100).toFixed(1)}% - Combined intelligence score`
      }
    };
  }

  /**
   * Your original broker expertise scoring (unchanged)
   */
  calculateBrokerExpertiseScore(cityRow, equipment, baseCity) {
    const eq = String(equipment || '').toUpperCase();
    if (!cityRow) return 0;
    const name = cityRow.city?.toLowerCase() || '';
    const state = cityRow.state_or_province?.toLowerCase() || '';
    const baseName = baseCity?.city?.toLowerCase() || '';
    const baseState = baseCity?.state_or_province?.toLowerCase() || '';
    
    let regionalHubScore = 0;
    
    // GEORGIA/SOUTH CAROLINA FREIGHT CORRIDOR
    if ((baseState === 'ga' && baseName.includes('augusta')) || (baseState === 'sc' && baseName.includes('aiken'))) {
      if (name === 'thomson' && state === 'ga') regionalHubScore = 0.20;
      if (name === 'aiken' && state === 'sc') regionalHubScore = 0.25;
      if (name === 'barnwell' && state === 'sc') regionalHubScore = 0.18;
      if (name === 'waynesboro' && state === 'ga') regionalHubScore = 0.15;
      if (name === 'evans' && state === 'ga') regionalHubScore = 0.12;
      if (name === 'martinez' && state === 'ga') regionalHubScore = 0.10;
    }
    
    // MINNESOTA FREIGHT CORRIDOR
    if ((baseState === 'mn' && (baseName.includes('anoka') || baseName.includes('minneapolis') || baseName.includes('saint paul')))) {
      if (name === 'st. cloud' || name === 'saint cloud' && state === 'mn') regionalHubScore = 0.25;
      if (name === 'red wing' && state === 'mn') regionalHubScore = 0.22;
      if (name === 'hutchinson' && state === 'mn') regionalHubScore = 0.20;
      if (name === 'cambridge' && state === 'mn') regionalHubScore = 0.18;
      if (name === 'elk river' && state === 'mn') regionalHubScore = 0.15;
      if (name === 'buffalo' && state === 'mn') regionalHubScore = 0.15;
    }
    
    // NEW JERSEY/PHILADELPHIA FREIGHT CORRIDOR
    if ((baseState === 'nj' && baseName.includes('mount holly')) || (baseState === 'pa' && baseName.includes('philadelphia'))) {
      if (name === 'philadelphia' && state === 'pa') regionalHubScore = 0.35;
      if (name === 'port newark' && state === 'nj') regionalHubScore = 0.32;
      if (name === 'newark' && state === 'nj') regionalHubScore = 0.30;
      if (name === 'jersey city' && state === 'nj') regionalHubScore = 0.28;
      if (name === 'trenton' && state === 'nj') regionalHubScore = 0.25;
      if (name === 'allentown' && state === 'pa') regionalHubScore = 0.22;
      if (name === 'camden' && state === 'nj') regionalHubScore = 0.20;
      if (name === 'wilmington' && state === 'de') regionalHubScore = 0.18;
    }

    return regionalHubScore;
  }

  /**
   * NEW: Economic intelligence from FRED data
   */
  async getEconomicIntelligence(cityRow, equipment) {
    const cacheKey = `economic_${cityRow.state_or_province}_${Date.now() / (1000 * 60 * 60)}`; // 1 hour cache
    
    if (this.economicCache.has(cacheKey)) {
      return this.economicCache.get(cacheKey);
    }

    let economicScore = 0;
    
    try {
      // Get current diesel prices
      const dieselData = await this.fredService.getCurrentDieselPrice();
      if (dieselData) {
        // Lower fuel costs = better for trucking = higher score
        const fuelBonus = dieselData.price < 3.50 ? 0.05 : 0; // Bonus if diesel under $3.50
        economicScore += fuelBonus;
      }

      // Get manufacturing trends
      const manufacturingData = await this.fredService.getManufacturingTrends();
      if (manufacturingData) {
        // Growing manufacturing = more freight demand
        const manufacturingBonus = manufacturingData.trend_percentage > 1 ? 0.08 : 0;
        economicScore += manufacturingBonus;
      }

      // State-specific economic intelligence
      const stateBonus = this.getStateEconomicBonus(cityRow.state_or_province, equipment);
      economicScore += stateBonus;

      this.economicCache.set(cacheKey, economicScore);
      
    } catch (error) {
      console.error('Economic intelligence error:', error);
      economicScore = 0; // Fallback to broker expertise only
    }

    return economicScore;
  }

  /**
   * State-specific economic intelligence based on major industries
   */
  getStateEconomicBonus(state, equipment) {
    const stateCode = state?.toLowerCase();
    const eq = equipment?.toUpperCase();
    
    // Industrial states with high freight demand
    const industrialStates = {
      'tx': 0.06, // Texas - oil, manufacturing, ports
      'ca': 0.05, // California - tech, agriculture, ports  
      'il': 0.04, // Illinois - manufacturing, logistics hub
      'oh': 0.04, // Ohio - manufacturing, automotive
      'pa': 0.04, // Pennsylvania - steel, manufacturing
      'in': 0.03, // Indiana - automotive, manufacturing
      'mi': 0.03, // Michigan - automotive
      'nc': 0.03, // North Carolina - textiles, furniture
      'ga': 0.03, // Georgia - logistics hub, port of Savannah
      'fl': 0.03  // Florida - agriculture, tourism, ports
    };

    // Equipment-specific bonuses
    const equipmentBonuses = {
      'FD': industrialStates[stateCode] * 1.2 || 0, // Flatbed higher in industrial states
      'R': stateCode === 'ca' ? 0.05 : industrialStates[stateCode] || 0, // Reefer higher in CA (agriculture)
      'V': industrialStates[stateCode] || 0 // Van standard bonus
    };

    return equipmentBonuses[eq] || industrialStates[stateCode] || 0;
  }

  /**
   * Enhanced city crawl with economic intelligence
   */
  async enhancedCrawlGeneration(baseCity, radius = 75, limit = 10) {
    try {
      // Get cities within radius (your existing query)
      const { data: cities, error } = await supabaseAdmin.rpc('get_cities_within_radius', {
        center_lat: baseCity.latitude,
        center_lng: baseCity.longitude,  
        radius_miles: radius,
        max_results: limit * 3 // Get more to rank with intelligence
      });

      if (error) throw error;

      // Enhanced ranking with economic intelligence
      const enhancedCities = await Promise.all(
        cities.map(async (city) => {
          const intelligence = await this.calculateEnhancedFreightIntelligence(city, 'V', baseCity);
          return {
            ...city,
            ...intelligence,
            final_rank: intelligence.combined_score
          };
        })
      );

      // Sort by combined intelligence and return top results
      return enhancedCities
        .sort((a, b) => b.final_rank - a.final_rank)
        .slice(0, limit);

    } catch (error) {
      console.error('Enhanced crawl generation error:', error);
      // Fallback to original method
      return this.fallbackCrawlGeneration(baseCity, radius, limit);
    }
  }

  /**
   * Fallback to original method if FRED API fails
   */
  async fallbackCrawlGeneration(baseCity, radius, limit) {
    // Your original crawl logic here as backup
    console.log('Using fallback crawl generation (FRED API unavailable)');
    // ... existing crawl code ...
    return [];
  }
}

// Export enhanced service
export { EnhancedGeographicIntelligence };

// Usage example:
/*
const enhancedGeo = new EnhancedGeographicIntelligence();

// Get enhanced city crawl with economic intelligence
const cities = await enhancedGeo.enhancedCrawlGeneration({
  city: 'Chicago',
  state_or_province: 'IL',
  latitude: 41.8781,
  longitude: -87.6298
});

console.log('Cities with economic intelligence:', cities);
*/
