// lib/FreightIntelligence.js
// Generates diverse pairs of cities using geographic crawl system

import { generateGeographicCrawlPairs } from './geographicCrawl_fixed.js';
import { adminSupabase } from '../utils/supabaseClient.js';

export class FreightIntelligence {
  constructor() {
    this.supabase = adminSupabase;
  }
  
  /**
   * Generate diverse pairs using our geographic crawl
   * Always generates exactly 6 pairs per DAT spec
   */
  async generateDiversePairs({ origin, destination, equipment }) {
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
      console.log(`🚛 Equipment: ${equipment || 'Not specified'}`);
      
      const result = await generateGeographicCrawlPairs({
        origin,
        destination,
        equipment,
        usedCities: new Set()
      });
      
      if (!result?.pairs?.length) {
        throw new Error('Failed to generate any pairs');
      }
      
      console.log(`✅ Generated ${result.pairs.length} pairs`);
      console.log(`   Base: ${result.baseOrigin.city}, ${result.baseOrigin.state} -> ${result.baseDest.city}, ${result.baseDest.state}`);
      console.log(`   Unique KMAs - Pickup: ${result.kmaAnalysis.uniquePickupKmas}, Delivery: ${result.kmaAnalysis.uniqueDeliveryKmas}`);
      
      return result;
      
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
