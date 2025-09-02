import { generateGeographicCrawlPairs } from './geographicCrawl.js';
import { adminSupabase } from '../utils/supabaseClient.js';

/**
 * FreightIntelligence class for managing freight brokerage intelligence operations
 */
export class FreightIntelligence {
    constructor() {
        this.supabase = adminSupabase;
    }

    /**
     * Generate diverse pairs using our proven geographic crawl system
     */
    async generateDiversePairs({ origin, destination, equipment, preferFillTo10 = true }) {
        console.log('🧠 FreightIntelligence: Starting pair generation...');
        try {
            if (!origin?.city || !origin?.state || !destination?.city || !destination?.state) {
                throw new Error('Missing required city/state data');
            }
            
            console.log(`📍 From: ${origin.city}, ${origin.state} To: ${destination.city}, ${destination.state}`);
            console.log(`🚛 Equipment: ${equipment || 'Not specified'}`);
            
            const result = await generateGeographicCrawlPairs({
                origin,
                destination,
                equipment,
                preferFillTo10
            });

            if (!result?.pairs?.length) {
                console.error('❌ Geographic crawl returned no pairs');
                throw new Error('Failed to generate any valid pairs');
            }

            const kmaAnalysis = result.kmaAnalysis || {};
            console.log(`✅ Generated ${result.pairs.length} pairs with KMA diversity:`);
            console.log(`   Required: ${kmaAnalysis.required || 5}, Achieved: ${result.pairs.length}`);
            console.log(`   Unique KMAs - Pickup: ${kmaAnalysis.uniquePickupKmas || 0}, Delivery: ${kmaAnalysis.uniqueDeliveryKmas || 0}`);

            return {
                pairs: result.pairs,
                baseOrigin: result.baseOrigin || origin,
                baseDest: result.baseDest || destination,
                kmaAnalysis: kmaAnalysis
            };
        } catch (error) {
            console.error('❌ FREIGHT INTELLIGENCE ERROR:');
            console.error(`   Origin: ${origin?.city}, ${origin?.state}`);
            console.error(`   Dest: ${destination?.city}, ${destination?.state}`);
            console.error(`   Equipment: ${equipment}`);
            console.error(`   Error: ${error.message}`);
            throw error; // Propagate for proper handling
        }
    }

    /**
     * Calculate freight score for a city pair
     */
    calculateFreightScore(pair) {
        if (!pair?.pickup || !pair?.delivery) return 0;
        return (pair.score || 0.5) + (pair.geographic?.pickup_intelligence || 0) + (pair.geographic?.delivery_intelligence || 0);
    }
}
