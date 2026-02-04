// File: src/lib/marketUtils.js
// RapidRoutes 2.0 - Market Utilities
// Purpose: Regional multiplier application and market condition helpers

/**
 * Lazy import of Supabase admin client to avoid bundling in client-side code.
 */
async function getSupabaseAdmin() {
    const mod = await import("@/lib/supabaseAdmin");
    return mod.default;
}

/**
 * Valid region identifiers for market conditions.
 */
export const VALID_REGIONS = ['northeast', 'southeast', 'midwest', 'southwest', 'west'];

/**
 * State to region mapping (duplicated from arbitrageCalculator for module independence).
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
 * Get all states belonging to a region.
 * @param {string} region - Region identifier
 * @returns {string[]} Array of state codes
 */
export function getStatesForRegion(region) {
    if (!VALID_REGIONS.includes(region)) {
        return [];
    }
    return Object.entries(STATE_TO_REGION)
        .filter(([_, r]) => r === region)
        .map(([state]) => state);
}

/**
 * Get region for a state code.
 * @param {string} stateCode - Two-letter state code
 * @returns {string} Region identifier
 */
export function getRegionForState(stateCode) {
    if (!stateCode) return 'midwest';
    const normalized = stateCode.toUpperCase().trim();
    return STATE_TO_REGION[normalized] || 'midwest';
}

/**
 * Fetch the current multiplier for a specific region.
 * 
 * @param {string} region - Region identifier
 * @returns {number} Rate multiplier (defaults to 1.0)
 */
export async function getMultiplierForRegion(region) {
    if (!VALID_REGIONS.includes(region)) {
        console.warn(`[marketUtils] Invalid region: ${region}`);
        return 1.0;
    }

    try {
        const supabase = await getSupabaseAdmin();
        const { data, error } = await supabase
            .from('market_conditions')
            .select('rate_multiplier')
            .eq('region', region)
            .single();

        if (error || !data) {
            return 1.0;
        }

        return parseFloat(data.rate_multiplier) || 1.0;
    } catch (err) {
        console.error('[marketUtils] Error fetching multiplier:', err);
        return 1.0;
    }
}

/**
 * Apply regional market multiplier to a historical rate.
 * 
 * This converts 2025 historical rates from dat_loads_2025 into
 * "live" adjusted rates based on current market conditions.
 * 
 * Formula: live_rate = historical_rate * multiplier
 * Where: multiplier = current_spot_rate / 2025_regional_average
 * 
 * @param {number} rate - Historical rate from dat_loads_2025
 * @param {string} region - Region identifier (or state code)
 * @returns {Object} Adjusted rate with metadata
 * 
 * @example
 * const result = await applyRegionalMultiplier(2.50, 'WA');
 * // Returns:
 * // {
 * //   originalRate: 2.50,
 * //   region: 'west',
 * //   multiplier: 1.15,
 * //   adjustedRate: 2.88
 * // }
 */
export async function applyRegionalMultiplier(rate, region) {
    // Validate rate input
    if (!rate || rate <= 0) {
        return {
            originalRate: rate,
            region: null,
            multiplier: 1.0,
            adjustedRate: 0,
            error: 'Invalid rate provided'
        };
    }

    // Normalize region - could be a state code or region name
    let normalizedRegion = region?.toLowerCase();

    // If it looks like a state code (2 chars), convert to region
    if (region && region.length === 2) {
        normalizedRegion = getRegionForState(region);
    }

    // Validate region
    if (!VALID_REGIONS.includes(normalizedRegion)) {
        console.warn(`[applyRegionalMultiplier] Invalid region: ${region}, defaulting to midwest`);
        normalizedRegion = 'midwest';
    }

    // Fetch current multiplier from market_conditions
    const multiplier = await getMultiplierForRegion(normalizedRegion);

    // Apply multiplier
    const adjustedRate = rate * multiplier;

    return {
        originalRate: parseFloat(rate.toFixed(2)),
        region: normalizedRegion,
        multiplier: parseFloat(multiplier.toFixed(3)),
        adjustedRate: parseFloat(adjustedRate.toFixed(2))
    };
}

/**
 * Batch apply regional multiplier to multiple rates.
 * Optimizes by fetching all multipliers at once.
 * 
 * @param {Array} items - Array of { rate, region } objects
 * @returns {Array} Array of adjusted rate results
 */
export async function applyRegionalMultiplierBatch(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return [];
    }

    // Fetch all multipliers at once
    const supabase = await getSupabaseAdmin();
    const { data: conditions } = await supabase
        .from('market_conditions')
        .select('region, rate_multiplier');

    const multiplierMap = (conditions || []).reduce((acc, c) => {
        acc[c.region] = parseFloat(c.rate_multiplier) || 1.0;
        return acc;
    }, {});

    // Apply to each item
    return items.map(item => {
        const rate = parseFloat(item.rate) || 0;
        let region = item.region?.toLowerCase();

        // Convert state to region if needed
        if (item.region && item.region.length === 2) {
            region = getRegionForState(item.region);
        }

        if (!VALID_REGIONS.includes(region)) {
            region = 'midwest';
        }

        const multiplier = multiplierMap[region] || 1.0;

        return {
            originalRate: parseFloat(rate.toFixed(2)),
            region: region,
            multiplier: parseFloat(multiplier.toFixed(3)),
            adjustedRate: parseFloat((rate * multiplier).toFixed(2))
        };
    });
}

/**
 * Calculate and update the multiplier for a region based on new spot rate.
 * Admin-only function for Market Calibration widget.
 * 
 * @param {string} region - Region to update
 * @param {number} newSpotRate - Current spot rate input by admin
 * @returns {Object} Update result with new multiplier
 */
export async function updateRegionalMultiplier(region, newSpotRate) {
    if (!VALID_REGIONS.includes(region)) {
        return { success: false, error: `Invalid region: ${region}` };
    }

    if (!newSpotRate || newSpotRate <= 0) {
        return { success: false, error: 'Spot rate must be greater than 0' };
    }

    const supabase = await getSupabaseAdmin();

    // Step 1: Get 2025 regional average from dat_loads_2025 (READ-ONLY)
    const regionStates = getStatesForRegion(region);

    const { data: historicalLoads, error: queryError } = await supabase
        .from('dat_loads_2025')
        .select('"Origin State", "Rate Per Mile", "Total Rate", "DAT Used Miles"')
        .in('Origin State', regionStates)
        .limit(5000);

    if (queryError) {
        console.error('[updateRegionalMultiplier] Query error:', queryError);
        return { success: false, error: 'Failed to query historical data' };
    }

    // Calculate historical average
    let historicalAvg = 0;
    const ratedLoads = (historicalLoads || []).filter(l => {
        const rate = l['Rate Per Mile'];
        return rate && parseFloat(rate) > 0;
    });

    if (ratedLoads.length > 0) {
        const sum = ratedLoads.reduce((acc, l) => acc + parseFloat(l['Rate Per Mile']), 0);
        historicalAvg = sum / ratedLoads.length;
    }

    // Fallback if no rate per mile data
    if (historicalAvg === 0) {
        const loadsWithCalc = (historicalLoads || []).filter(l =>
            l['Total Rate'] > 0 && l['DAT Used Miles'] > 0
        );
        if (loadsWithCalc.length > 0) {
            const sum = loadsWithCalc.reduce((acc, l) =>
                acc + (parseFloat(l['Total Rate']) / parseFloat(l['DAT Used Miles'])), 0
            );
            historicalAvg = sum / loadsWithCalc.length;
        }
    }

    // Default to spot rate if no historical data (multiplier = 1.0)
    if (historicalAvg === 0) {
        historicalAvg = newSpotRate;
    }

    // Step 2: Calculate new multiplier
    const newMultiplier = newSpotRate / historicalAvg;

    // Step 3: Get current user for audit trail
    const { data: { user } } = await supabase.auth.getUser();

    // Step 4: Update market_conditions table
    const { error: updateError } = await supabase
        .from('market_conditions')
        .update({
            current_spot_rate: newSpotRate,
            historical_avg_rate: parseFloat(historicalAvg.toFixed(2)),
            rate_multiplier: parseFloat(newMultiplier.toFixed(3)),
            updated_at: new Date().toISOString(),
            updated_by: user?.id || null
        })
        .eq('region', region);

    if (updateError) {
        console.error('[updateRegionalMultiplier] Update error:', updateError);
        return { success: false, error: 'Failed to update market conditions' };
    }

    return {
        success: true,
        region: region,
        spotRate: parseFloat(newSpotRate.toFixed(2)),
        historicalAvg: parseFloat(historicalAvg.toFixed(2)),
        multiplier: parseFloat(newMultiplier.toFixed(3)),
        updatedAt: new Date().toISOString()
    };
}

/**
 * Get all current market conditions.
 * 
 * @returns {Object[]} Array of market condition objects
 */
export async function getAllMarketConditions() {
    try {
        const supabase = await getSupabaseAdmin();
        const { data, error } = await supabase
            .from('market_conditions')
            .select('*')
            .order('region');

        if (error) {
            console.error('[getAllMarketConditions] Error:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('[getAllMarketConditions] Exception:', err);
        return [];
    }
}

export default {
    applyRegionalMultiplier,
    applyRegionalMultiplierBatch,
    updateRegionalMultiplier,
    getMultiplierForRegion,
    getAllMarketConditions,
    getRegionForState,
    getStatesForRegion,
    VALID_REGIONS
};
