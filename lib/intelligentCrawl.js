// lib/intelligentCrawl.js
// BROKER-INTELLIGENT: Uses your preferred pickup locations + geographic KMA database
import { adminSupabase } from '../utils/supabaseClient.js';
import { generateGeographicCrawlPairs } from './geographicCrawl.js';

/**
 * Get broker's preferred pickup cities ordered by frequency
 */
async function getPreferredPickups(userId) {
  try {
    const { data: preferredPickups, error } = await adminSupabase
      .from('preferred_pickups')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('frequency_score', { ascending: false });
    
    if (error) {
      console.log('⚠️ Preferred pickups query failed:', error.message);
      return [];
    }
    
    console.log(`📍 Loaded ${preferredPickups?.length || 0} preferred pickup locations`);
    return preferredPickups || [];
  } catch (error) {
    console.log('⚠️ Preferred pickups not available:', error.message);
    return [];
  }
}

/**
 * INTELLIGENT CRAWL: Uses your preferred pickups + 75-mile geographic diversity
 */
export async function generateIntelligentCrawlPairs({ 
  origin, 
  destination, 
  equipment, 
  preferFillTo10, 
  usedCities = new Set(),
  userId = 'default_user'
}) {
  try {
    console.log(`🧠 INTELLIGENT CRAWL: ${origin.city}, ${origin.state} -> ${destination.city}, ${destination.state}`);
    
    // Get your preferred pickup locations
    const preferredPickups = await getPreferredPickups(userId);
    
    if (preferredPickups.length > 0) {
      console.log(`🎯 Using YOUR preferred pickup locations for intelligent generation`);
      
      // Check if the current origin matches any of your preferred pickups
      const matchingPickup = preferredPickups.find(pickup => 
        pickup.city.toLowerCase() === origin.city.toLowerCase() &&
        pickup.state_or_province.toLowerCase() === origin.state.toLowerCase()
      );
      
      if (matchingPickup) {
        console.log(`✅ Origin ${origin.city}, ${origin.state} matches your preferred pickup location!`);
        console.log(`📊 Frequency: ${matchingPickup.frequency_score}/week, Equipment: ${matchingPickup.equipment_preference?.join(', ') || 'any'}`);
        
        // This is one of your preferred pickups - use geographic crawl with variation
        const result = await generateGeographicCrawlPairs({
          origin,
          destination,
          equipment,
          preferFillTo10,
          usedCities
        });
        
        // Mark this as preferred pickup intelligence
        if (result.pairs) {
          result.pairs.forEach(pair => {
            pair.intelligence_type = 'preferred_pickup';
            pair.pickup_frequency = matchingPickup.frequency_score;
            pair.equipment_match = matchingPickup.equipment_preference?.includes(equipment) || false;
          });
        }
        
        return result;
      } else {
        console.log(`ℹ️ Origin ${origin.city}, ${origin.state} is not in your preferred pickup list`);
        console.log(`📋 Your preferred pickups: ${preferredPickups.map(p => `${p.city}, ${p.state_or_province}`).join('; ')}`);
      }
    } else {
      console.log(`ℹ️ No preferred pickups configured - you can add them on the profile page`);
    }
    
    // FALLBACK: Use standard geographic crawl for non-preferred origins
    console.log(`🗺️ Using standard geographic crawl with 75-mile rule`);
    const result = await generateGeographicCrawlPairs({
      origin,
      destination,
      equipment,
      preferFillTo10,
      usedCities
    });
    
    return result;
    
  } catch (error) {
    console.error('Intelligent crawl error:', error);
    return { 
      baseOrigin: { city: origin.city, state: origin.state, zip: '' },
      baseDest: { city: destination.city, state: destination.state, zip: '' },
      pairs: [],
      usedCities
    };
  }
}
