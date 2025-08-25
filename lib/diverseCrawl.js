// lib/diverseCrawl.js
// Enhanced city crawling with global city diversity tracking across multiple lanes
import { generateCrawlPairs } from './datcrawl.js';

/**
 * Generate crawl pairs with global city diversity tracking
 * Ensures no city appears twice across an entire CSV export
 */
export async function generateDiverseCrawlPairs({ 
  origin, 
  destination, 
  equipment, 
  preferFillTo10, 
  usedCities = new Set() 
}) {
  const result = await generateCrawlPairs({ origin, destination, equipment, preferFillTo10 });
  
  // Filter out any cities that have already been used in this export
  const filteredPairs = result.pairs.filter(pair => {
    const pickupKey = `${pair.pickup.city.toLowerCase()},${pair.pickup.state.toLowerCase()}`;
    const deliveryKey = `${pair.delivery.city.toLowerCase()},${pair.delivery.state.toLowerCase()}`;
    
    return !usedCities.has(pickupKey) && !usedCities.has(deliveryKey);
  });
  
  // Take only the first 5 unique pairs
  const uniquePairs = filteredPairs.slice(0, preferFillTo10 ? 5 : 3);
  
  // Mark all cities as used
  uniquePairs.forEach(pair => {
    const pickupKey = `${pair.pickup.city.toLowerCase()},${pair.pickup.state.toLowerCase()}`;
    const deliveryKey = `${pair.delivery.city.toLowerCase()},${pair.delivery.state.toLowerCase()}`;
    usedCities.add(pickupKey);
    usedCities.add(deliveryKey);
  });
  
  // Also mark base cities as used
  const baseOriginKey = `${result.baseOrigin.city.toLowerCase()},${result.baseOrigin.state.toLowerCase()}`;
  const baseDestKey = `${result.baseDest.city.toLowerCase()},${result.baseDest.state.toLowerCase()}`;
  usedCities.add(baseOriginKey);
  usedCities.add(baseDestKey);
  
  console.log(`🌍 DIVERSE CRAWL: Generated ${uniquePairs.length} unique pairs, ${usedCities.size} total cities used`);
  
  return {
    ...result,
    pairs: uniquePairs
  };
}
