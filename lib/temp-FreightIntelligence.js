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
        console.log('🧠 FreightIntelligence: Delegating to proven geographic crawl system');
        const result = await generateGeographicCrawlPairs({
            origin,
            destination,
            equipment,
            preferFillTo10
        });

        if (!result?.pairs?.length) {
            console.error('❌ Geographic crawl returned no pairs');
            return {
                pairs: [],
                baseOrigin: origin,
                baseDest: destination,
                kmaAnalysis: { required: 5, achieved: 0 }
            };
        }

        console.log(`✅ Generated ${result.pairs.length} pairs with KMA diversity`);
        return {
            pairs: result.pairs,
            baseOrigin: result.baseOrigin || origin,
            baseDest: result.baseDest || destination,
            kmaAnalysis: result.kmaAnalysis || {}
        };
    }

    /**
     * Calculate freight score for a city pair
     */
    calculateFreightScore(pair) {
        if (!pair?.pickup || !pair?.delivery) return 0;
        return (pair.score || 0.5) + (pair.geographic?.pickup_intelligence || 0) + (pair.geographic?.delivery_intelligence || 0);
    }
}
