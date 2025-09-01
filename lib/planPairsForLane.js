// lib/planPairsForLane.js
// Handles lane pair planning and generation strategy

import { FreightIntelligence } from './FreightIntelligence.js';
import { ensureLaneWeightValidity } from './ensureLaneWeight.js';

/**
 * Generate intelligent crawl pairs for lane
 * @param {Object} params - Parameters for pair generation
 * @param {Object} params.origin - Origin city object
 * @param {Object} params.destination - Destination city object
 * @param {string} params.equipment - Equipment code
 * @param {boolean} params.preferFillTo10 - Whether to prefer filling to 10 pairs
 * @param {Set} params.usedCities - Set of already used cities
 * @returns {Promise<{pairs: Array, baseOrigin: Object, baseDest: Object}>}
 */
async function generateIntelligentCrawlPairs({
    origin,
    destination,
    equipment,
    preferFillTo10 = false,
    usedCities = new Set()
}) {
    const intelligence = new FreightIntelligence();
    const pairs = await intelligence.generateDiversePairs({
        origin,
        destination,
        equipment,
        preferFillTo10,
        usedCities
    });

    return {
        pairs,
        baseOrigin: origin,
        baseDest: destination
    };
}

/**
 * Plan pairs for a lane, ensuring all business rules
 * @param {Object} lane - Lane data object
 * @param {Object} options - Options object
 * @param {boolean} options.preferFillTo10 - Whether to prefer 10 pairs
 * @param {Set} options.usedCities - Set of already used cities
 * @returns {Promise<{pairs: Array, baseOrigin: Object, baseDest: Object}>}
 */
export async function planPairsForLane(lane, { preferFillTo10 = false, usedCities = new Set() } = {}) {
    // Validate weight and update if needed
    ensureLaneWeightValidity(lane);

    // Extract base city info
    const baseOrigin = { city: lane.origin_city, state: lane.origin_state };
    const baseDest = { city: lane.dest_city, state: lane.dest_state };

    // Generate intelligent pairs
    const result = await generateIntelligentCrawlPairs({
        origin: baseOrigin,
        destination: baseDest,
        equipment: lane.equipment_code,
        preferFillTo10,
        usedCities
    });

    return result;
}
