// lib/planPairsForLane.js
// DEPRECATED: This is now just a compatibility layer for FreightIntelligence.
// New code should use FreightIntelligence directly.

import { FreightIntelligence } from './FreightIntelligence.js';
import { ensureLaneWeightValidity } from './ensureLaneWeight.js';

/**
 * @deprecated Use FreightIntelligence.generateDiversePairs() directly
 */
export async function planPairsForLane(lane, { preferFillTo10 = false, usedCities = new Set() } = {}) {
    // Validate weight and update if needed
    ensureLaneWeightValidity(lane);

    // Create a FreightIntelligence instance and delegate to it
    const intelligence = new FreightIntelligence();
    const result = await intelligence.generateDiversePairs({
        origin: {
            city: lane.origin_city,
            state: lane.origin_state,
            zip: lane.origin_zip
        },
        destination: {
            city: lane.dest_city,
            state: lane.dest_state,
            zip: lane.dest_zip
        },
        equipment: lane.equipment_code,
        preferFillTo10: true,  // Always optimize
        usedCities
    });

    // Convert to old format for compatibility
    return {
        pairs: result,
        baseOrigin: {
            city: lane.origin_city,
            state: lane.origin_state,
            zip: lane.origin_zip
        },
        baseDest: {
            city: lane.dest_city,
            state: lane.dest_state,
            zip: lane.dest_zip
        }
    };
}
