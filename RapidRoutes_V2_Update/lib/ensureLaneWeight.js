// lib/ensureLaneWeight.js
// Helper functions to validate and ensure lane weights are valid

import { FreightIntelligence } from './FreightIntelligence.js';

/**
 * Validate and ensure lane weight is valid
 * Updates lane object in place if fixes are needed
 * @param {Object} lane - Lane data object
 * @throws {Error} If weight cannot be made valid
 */
export function ensureLaneWeightValidity(lane) {
    if (!lane || typeof lane !== 'object') {
        throw new Error('Invalid lane object');
    }

    // For fixed weight lanes
    if (!lane.randomize_weight) {
        if (!lane.weight_lbs || Number.isNaN(Number(lane.weight_lbs))) {
            throw new Error(`Weight missing for lane ${lane.id}. Fixed weight lanes require weight_lbs.`);
        }
        const weight = Number(lane.weight_lbs);
        if (weight <= 0) {
            throw new Error(`Invalid weight ${weight} for lane ${lane.id}. Must be positive.`);
        }
        return;
    }

    // For randomized weight lanes
    let weightMin = Number(lane.weight_min);
    let weightMax = Number(lane.weight_max);

    // CRITICAL: Validate randomized weight range
    if (weightMin > weightMax) {
        throw new Error(`Invalid weight range min(${weightMin}) > max(${weightMax}) for lane ${lane.id}`);
    }

    // CRITICAL: Validate each weight individually first
    if (!Number.isFinite(weightMin) || weightMin <= 0) {
        throw new Error(`Invalid weight_min ${weightMin} for lane ${lane.id}. Must be positive number.`);
    }

    if (!Number.isFinite(weightMax) || weightMax <= 0) {
        throw new Error(`Invalid weight_max ${weightMax} for lane ${lane.id}. Must be positive number.`);
    }
}
