/**
 * FRED API INTEGRATION FOR RAPIDROUTES
 * 
 * Federal Reserve Economic Data API integration to add fuel cost intelligence
 * to your lane scoring and pricing algorithms.
 * 
 * This adds REAL freight intelligence that directly impacts profitability.
 */

// FRED API Configuration
const FRED_BASE_URL = 'https://api.stlouisfed.org/fred';
const FRED_API_KEY = process.env.FRED_API_KEY; // Free from https://fred.stlouisfed.org/docs/api/api_key.html

// Key Economic Indicators for Freight
const FREIGHT_INDICATORS = {
  DIESEL_PRICES: 'DHHNGSP',           // US Diesel Highway Retail Prices (Weekly)
  GDP_GROWTH: 'GDP',                  // Gross Domestic Product
  MANUFACTURING: 'INDPRO',            // Industrial Production Index
  UNEMPLOYMENT: 'UNRATE',             // Unemployment Rate
  TRUCKING_RATES: 'TSATR11',         // Transportation Services Index
  RAIL_TRAFFIC: 'RAILFRTINTERMODAL'  // Rail Freight Intermodal Traffic
};

class FREDIntelligenceService {
  
  /**
   * Get current diesel prices to adjust lane profitability
   */
  async getCurrentDieselPrice() {
    try {
      const response = await fetch(
        `${FRED_BASE_URL}/series/observations?series_id=${FREIGHT_INDICATORS.DIESEL_PRICES}&api_key=${FRED_API_KEY}&file_type=json&limit=1&sort_order=desc`
      );
      const data = await response.json();
      
      if (data.observations && data.observations.length > 0) {
        const latestPrice = parseFloat(data.observations[0].value);
        const priceDate = data.observations[0].date;
        
        return {
          price: latestPrice,
          date: priceDate,
          unit: 'dollars_per_gallon'
        };
      }
      
      return null;
    } catch (error) {
      console.error('FRED API Error (Diesel Prices):', error);
      return null;
    }
  }
  
  /**
   * Get manufacturing index to identify high-freight regions
   */
  async getManufacturingTrends() {
    try {
      const response = await fetch(
        `${FRED_BASE_URL}/series/observations?series_id=${FREIGHT_INDICATORS.MANUFACTURING}&api_key=${FRED_API_KEY}&file_type=json&limit=12&sort_order=desc`
      );
      const data = await response.json();
      
      if (data.observations && data.observations.length >= 2) {
        const latest = parseFloat(data.observations[0].value);
        const previous = parseFloat(data.observations[1].value);
        const trend = ((latest - previous) / previous) * 100;
        
        return {
          current_index: latest,
          trend_percentage: trend,
          interpretation: trend > 2 ? 'Strong Manufacturing Growth' :
                         trend > 0 ? 'Moderate Growth' :
                         trend > -2 ? 'Stable' : 'Declining Manufacturing'
        };
      }
      
      return null;
    } catch (error) {
      console.error('FRED API Error (Manufacturing):', error);
      return null;
    }
  }
  
  /**
   * Enhanced lane scoring with economic intelligence
   */
  async enhanceLaneScoring(lane) {
    const dieselData = await this.getCurrentDieselPrice();
    const manufacturingData = await this.getManufacturingTrends();
    
    let enhancedScore = lane.base_score || 100;
    
    // Adjust for current fuel costs
    if (dieselData) {
      const nationalAverage = 3.50; // Baseline diesel price
      const fuelAdjustment = (nationalAverage - dieselData.price) * 10;
      enhancedScore += fuelAdjustment;
      
      lane.fuel_intelligence = {
        current_diesel_price: dieselData.price,
        fuel_adjustment: fuelAdjustment,
        fuel_cost_trend: dieselData.price > nationalAverage ? 'High Fuel Costs' : 'Favorable Fuel Costs'
      };
    }
    
    // Adjust for manufacturing trends (more manufacturing = more freight)
    if (manufacturingData) {
      const manufacturingBonus = manufacturingData.trend_percentage > 0 ? 15 : 0;
      enhancedScore += manufacturingBonus;
      
      lane.economic_intelligence = {
        manufacturing_trend: manufacturingData.trend_percentage,
        manufacturing_bonus: manufacturingBonus,
        market_outlook: manufacturingData.interpretation
      };
    }
    
    lane.enhanced_score = enhancedScore;
    lane.intelligence_date = new Date().toISOString();
    
    return lane;
  }
  
  /**
   * Get pricing recommendations based on economic data
   */
  async getPricingIntelligence(originState, destState) {
    const dieselData = await this.getCurrentDieselPrice();
    
    if (!dieselData) return null;
    
    // Base rate per mile calculations
    const baseFuelCost = 0.60; // per mile fuel cost at $3.50/gallon
    const currentFuelCost = (dieselData.price / 3.50) * baseFuelCost;
    const fuelSurcharge = Math.max(0, currentFuelCost - baseFuelCost);
    
    return {
      recommended_fuel_surcharge: fuelSurcharge.toFixed(3),
      current_diesel_price: dieselData.price,
      pricing_advice: dieselData.price > 4.00 ? 
        'Add fuel surcharge - high diesel costs' : 
        'Standard pricing - fuel costs normal',
      last_updated: dieselData.date
    };
  }
}

// Integration with existing RapidRoutes system
async function enhanceRapidRoutesWithFRED() {
  const fredService = new FREDIntelligenceService();
  
  console.log('🔥 ADDING FRED INTELLIGENCE TO RAPIDROUTES');
  console.log('==========================================');
  
  // Example: Enhance existing lane with economic intelligence
  const exampleLane = {
    id: 1,
    origin: 'Chicago, IL',
    destination: 'Atlanta, GA',
    base_score: 85,
    equipment: 'Van',
    miles: 717
  };
  
  const enhancedLane = await fredService.enhanceLaneScoring(exampleLane);
  
  console.log('\n📊 LANE ENHANCEMENT RESULTS:');
  console.log('============================');
  console.log('Original Score:', exampleLane.base_score);
  console.log('Enhanced Score:', enhancedLane.enhanced_score);
  console.log('Fuel Intelligence:', enhancedLane.fuel_intelligence);
  console.log('Economic Intelligence:', enhancedLane.economic_intelligence);
  
  // Example: Get pricing intelligence
  const pricingIntel = await fredService.getPricingIntelligence('IL', 'GA');
  
  console.log('\n💰 PRICING INTELLIGENCE:');
  console.log('=========================');
  console.log(pricingIntel);
  
  return {
    enhanced_lane: enhancedLane,
    pricing_intelligence: pricingIntel
  };
}

// Export for use in RapidRoutes
export { FREDIntelligenceService, enhanceRapidRoutesWithFRED, FREIGHT_INDICATORS };

// Quick test if run directly
if (process.env.NODE_ENV !== 'production') {
  // Uncomment to test (need FRED API key first):
  // enhanceRapidRoutesWithFRED();
}
