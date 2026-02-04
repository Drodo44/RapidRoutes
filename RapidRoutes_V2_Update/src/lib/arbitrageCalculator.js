// File: src/lib/arbitrageCalculator.js
// RapidRoutes 2.0 - Market Arbitrage Engine
// Purpose: Calculate market arbitrage opportunities between origin and destination markets
// Uses READ-ONLY access to dat_loads_2025 for historical rate data

/**
 * Lazy import of Supabase admin client to avoid bundling in client-side code.
 * This module is SERVER-ONLY.
 */
async function getSupabaseAdmin() {
    const mod = await import("@/lib/supabaseAdmin");
    return mod.default;
}

/**
 * Map of US state codes to their regional market zones.
 * Mirrors the SQL function get_region_for_state().
 */
const STATE_TO_REGION = {
    // Northeast
    ME: 'northeast', NH: 'northeast', VT: 'northeast', MA: 'northeast',
    RI: 'northeast', CT: 'northeast', NY: 'northeast', NJ: 'northeast', PA: 'northeast',
    // Southeast
    DE: 'southeast', MD: 'southeast', VA: 'southeast', WV: 'southeast',
    NC: 'southeast', SC: 'southeast', GA: 'southeast', FL: 'southeast',
    AL: 'southeast', MS: 'southeast', TN: 'southeast', KY: 'southeast', DC: 'southeast',
    // Midwest
    OH: 'midwest', IN: 'midwest', IL: 'midwest', MI: 'midwest', WI: 'midwest',
    MN: 'midwest', IA: 'midwest', MO: 'midwest', ND: 'midwest', SD: 'midwest',
    NE: 'midwest', KS: 'midwest',
    // Southwest
    TX: 'southwest', OK: 'southwest', AR: 'southwest', LA: 'southwest',
    NM: 'southwest', AZ: 'southwest',
    // West
    CO: 'west', UT: 'west', NV: 'west', CA: 'west', OR: 'west',
    WA: 'west', ID: 'west', MT: 'west', WY: 'west', AK: 'west', HI: 'west'
};

/**
 * Get regional market zone for a US state code.
 * @param {string} stateCode - Two-letter US state code
 * @returns {string} Region: 'northeast', 'southeast', 'midwest', 'southwest', or 'west'
 */
export function getRegionForState(stateCode) {
    if (!stateCode) return 'midwest';
    const normalized = stateCode.toUpperCase().trim();
    return STATE_TO_REGION[normalized] || 'midwest';
}

/**
 * Calculate average rate per mile from a set of load records.
 * Filters out invalid/zero rates before calculating.
 * 
 * @param {Array} loads - Array of load records from dat_loads_2025
 * @returns {number} Average rate per mile, or 0 if no valid data
 */
function calculateAverageRate(loads) {
    if (!loads || loads.length === 0) return 0;

    // dat_loads_2025 may have various rate field names - check common patterns
    const ratedLoads = loads.filter(load => {
        const rate = load['Rate Per Mile'] || load['rate_per_mile'] || load['RatePerMile'];
        return rate && parseFloat(rate) > 0;
    });

    if (ratedLoads.length === 0) {
        // Fallback: calculate from total rate / miles if available
        const loadsWithMiles = loads.filter(load => {
            const miles = load['DAT Used Miles'] || load['Customer Mileage'] || load['miles'];
            const totalRate = load['Total Rate'] || load['total_rate'];
            return miles > 0 && totalRate > 0;
        });

        if (loadsWithMiles.length === 0) return 0;

        const sum = loadsWithMiles.reduce((acc, load) => {
            const miles = parseFloat(load['DAT Used Miles'] || load['Customer Mileage'] || load['miles']);
            const totalRate = parseFloat(load['Total Rate'] || load['total_rate']);
            return acc + (totalRate / miles);
        }, 0);

        return sum / loadsWithMiles.length;
    }

    const sum = ratedLoads.reduce((acc, load) => {
        const rate = parseFloat(load['Rate Per Mile'] || load['rate_per_mile'] || load['RatePerMile']);
        return acc + rate;
    }, 0);

    return sum / ratedLoads.length;
}

/**
 * Fetch current market multipliers from market_conditions table.
 * 
 * @returns {Object} Map of region -> multiplier
 */
async function fetchMarketMultipliers() {
    try {
        const supabase = await getSupabaseAdmin();
        const { data, error } = await supabase
            .from('market_conditions')
            .select('region, rate_multiplier');

        if (error || !data) {
            console.warn('[arbitrageCalculator] Failed to fetch market conditions:', error);
            return {};
        }

        return data.reduce((acc, condition) => {
            acc[condition.region] = parseFloat(condition.rate_multiplier) || 1.0;
            return acc;
        }, {});
    } catch (err) {
        console.error('[arbitrageCalculator] Error fetching multipliers:', err);
        return {};
    }
}

/**
 * Query dat_loads_2025 for average outbound rate from a state.
 * READ-ONLY access to dat_loads_2025.
 * 
 * @param {string} stateCode - Origin state to query
 * @param {number} limit - Max records to sample (default 500)
 * @returns {number} Average rate per mile for outbound loads
 */
async function getOutboundRateForState(stateCode, limit = 500) {
    try {
        const supabase = await getSupabaseAdmin();

        // Query dat_loads_2025 for loads originating from this state
        // READ-ONLY: only SELECT, no modifications
        const { data, error } = await supabase
            .from('dat_loads_2025')
            .select('*')
            .eq('Origin State', stateCode.toUpperCase())
            .limit(limit);

        if (error) {
            console.warn(`[arbitrageCalculator] Query failed for state ${stateCode}:`, error);
            return 0;
        }

        return calculateAverageRate(data || []);
    } catch (err) {
        console.error('[arbitrageCalculator] Error querying outbound rates:', err);
        return 0;
    }
}

/**
 * Calculate market arbitrage opportunity between origin and destination markets.
 * 
 * This function:
 * 1. Determines the region for both origin and destination states
 * 2. Queries dat_loads_2025 (READ-ONLY) for average outbound rates
 * 3. Applies regional multipliers from market_conditions for "live" rates
 * 4. Compares destination outbound rate vs origin outbound rate
 * 
 * @param {Object} origin - Origin location { city, state, kma_code? }
 * @param {Object} destination - Destination location { city, state, kma_code? }
 * @returns {Object} Arbitrage analysis result
 * 
 * @example
 * const result = await calculateArbitrage(
 *   { city: 'Seattle', state: 'WA' },
 *   { city: 'Los Angeles', state: 'CA' }
 * );
 * // Returns:
 * // {
 * //   originMarket: { region: 'west', avgRate: 2.45, ... },
 * //   destinationMarket: { region: 'west', avgRate: 2.78, ... },
 * //   arbitrage: { exists: true, rateDifference: 0.33, recommendation: '...' }
 * // }
 */
export async function calculateArbitrage(origin, destination) {
    // Validate inputs
    if (!origin?.state || !destination?.state) {
        return {
            error: 'Both origin and destination must have a state code',
            originMarket: null,
            destinationMarket: null,
            arbitrage: { exists: false, rateDifference: 0, recommendation: null }
        };
    }

    // Step 1: Determine regions
    const originState = origin.state.toUpperCase();
    const destState = destination.state.toUpperCase();
    const originRegion = getRegionForState(originState);
    const destRegion = getRegionForState(destState);

    // Step 2: Fetch market multipliers
    const multipliers = await fetchMarketMultipliers();
    const originMultiplier = multipliers[originRegion] || 1.0;
    const destMultiplier = multipliers[destRegion] || 1.0;

    // Step 3: Query dat_loads_2025 for average outbound rates (READ-ONLY)
    const [originHistoricalRate, destHistoricalRate] = await Promise.all([
        getOutboundRateForState(originState),
        getOutboundRateForState(destState)
    ]);

    // Step 4: Apply multipliers for "live" rates
    const originLiveRate = originHistoricalRate * originMultiplier;
    const destLiveRate = destHistoricalRate * destMultiplier;

    // Step 5: Calculate arbitrage opportunity
    const rateDifference = destLiveRate - originLiveRate;
    const arbitrageExists = rateDifference > 0;

    // Build recommendation message
    let recommendation = null;
    if (arbitrageExists && rateDifference >= 0.05) {
        const destCity = destination.city || destState;
        recommendation = `Drive to ${destCity} to access higher outbound rates (+$${rateDifference.toFixed(2)}/mi)`;
    } else if (rateDifference < -0.05) {
        recommendation = `Consider return loads - origin market has higher outbound rates`;
    }

    return {
        originMarket: {
            state: originState,
            city: origin.city || null,
            region: originRegion,
            historicalRate: parseFloat(originHistoricalRate.toFixed(2)),
            multiplier: originMultiplier,
            liveRate: parseFloat(originLiveRate.toFixed(2))
        },
        destinationMarket: {
            state: destState,
            city: destination.city || null,
            region: destRegion,
            historicalRate: parseFloat(destHistoricalRate.toFixed(2)),
            multiplier: destMultiplier,
            liveRate: parseFloat(destLiveRate.toFixed(2))
        },
        arbitrage: {
            exists: arbitrageExists,
            rateDifference: parseFloat(rateDifference.toFixed(2)),
            percentDifference: originLiveRate > 0
                ? parseFloat(((rateDifference / originLiveRate) * 100).toFixed(1))
                : 0,
            recommendation: recommendation
        },
        calculatedAt: new Date().toISOString()
    };
}

/**
 * Get arbitrage summary for a lane object.
 * Convenience wrapper for calculateArbitrage.
 * 
 * @param {Object} lane - Lane object with origin/destination fields
 * @returns {Object} Arbitrage analysis
 */
export async function getArbitrageForLane(lane) {
    const origin = {
        city: lane.origin_city,
        state: lane.origin_state,
        kma_code: lane.origin_kma_code
    };

    const destination = {
        city: lane.destination_city || lane.destinationCity,
        state: lane.destination_state || lane.destinationState,
        kma_code: lane.destination_kma_code
    };

    return calculateArbitrage(origin, destination);
}

export default {
    calculateArbitrage,
    getArbitrageForLane,
    getRegionForState
};
