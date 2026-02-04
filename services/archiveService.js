// File: src/services/archiveService.js
// RapidRoutes 2.0 - Smart Archive Service
// Purpose: Handle Smart Archive workflow with Carrier Memory

/**
 * Lazy import of Supabase admin client to avoid bundling in client-side code.
 */
async function getSupabaseAdmin() {
    const mod = await import("@/lib/supabaseAdmin");
    return mod.default;
}

/**
 * Calculate margin between bill rate and carrier pay.
 * Returns margin amount and percentage.
 * 
 * @param {number} billRate - Customer bill rate
 * @param {number} carrierPay - Carrier pay rate
 * @returns {Object} { marginAmount, marginPercent }
 */
function calculateMargin(billRate, carrierPay) {
    if (!billRate || billRate <= 0) return { marginAmount: null, marginPercent: null };
    if (!carrierPay || carrierPay < 0) return { marginAmount: null, marginPercent: null };

    const marginAmount = billRate - carrierPay;
    const marginPercent = ((marginAmount / billRate) * 100);

    return {
        marginAmount: parseFloat(marginAmount.toFixed(2)),
        marginPercent: parseFloat(marginPercent.toFixed(2))
    };
}

/**
 * Smart Archive workflow handler.
 * 
 * When user archives a load:
 * 1. If covered: Prompts for carrier info, creates covered_loads record, updates lane
 * 2. If not covered: Simply archives the lane
 * 
 * This enables "Carrier Memory" - tracking who covered which lanes at what rate.
 * 
 * @param {string} laneId - UUID of the lane being archived
 * @param {Object|null} carrierData - Carrier info if load was covered, null if not
 * @param {boolean} carrierData.covered - True if load was covered
 * @param {string} carrierData.carrier_mc - Carrier MC number (required if covered)
 * @param {string} carrierData.carrier_name - Carrier name (required if covered)
 * @param {string} [carrierData.carrier_phone] - Carrier phone
 * @param {string} [carrierData.carrier_email] - Carrier email
 * @param {number} [carrierData.pay_rate] - Rate paid to carrier
 * @returns {Object} Result of archive operation
 * 
 * @example
 * // Archive with coverage
 * const result = await handleSmartArchive('lane-uuid', {
 *   covered: true,
 *   carrier_mc: 'MC123456',
 *   carrier_name: 'Swift Transportation',
 *   carrier_phone: '555-1234',
 *   carrier_email: 'dispatch@swift.com',
 *   pay_rate: 2500.00
 * });
 * 
 * // Archive without coverage
 * const result = await handleSmartArchive('lane-uuid', { covered: false });
 */
export async function handleSmartArchive(laneId, carrierData = null) {
    const supabase = await getSupabaseAdmin();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { success: false, error: 'Authentication required' };
    }

    // Validate lane ID
    if (!laneId) {
        return { success: false, error: 'Lane ID is required' };
    }

    // Step 1: Fetch the lane being archived
    const { data: lane, error: laneError } = await supabase
        .from('lanes')
        .select('*')
        .eq('id', laneId)
        .single();

    if (laneError || !lane) {
        console.error('[archiveService] Lane not found:', laneError);
        return { success: false, error: 'Lane not found' };
    }

    // Step 2: Check if load was covered
    const wasCovered = carrierData?.covered === true;

    if (wasCovered) {
        // Validate required carrier fields
        if (!carrierData.carrier_mc) {
            return { success: false, error: 'Carrier MC number is required' };
        }
        if (!carrierData.carrier_name) {
            return { success: false, error: 'Carrier name is required' };
        }

        // Calculate margin if possible
        const { marginAmount, marginPercent } = calculateMargin(
            lane.bill_rate,
            carrierData.pay_rate
        );

        // Step 2a: Create covered_loads record
        const coveredLoadData = {
            lane_id: laneId,
            covered_by_user_id: user.id,
            carrier_mc: carrierData.carrier_mc.trim(),
            carrier_name: carrierData.carrier_name.trim(),
            carrier_phone: carrierData.carrier_phone?.trim() || null,
            carrier_email: carrierData.carrier_email?.trim().toLowerCase() || null,
            carrier_pay_rate: carrierData.pay_rate || null,
            origin_city: lane.origin_city,
            origin_state: lane.origin_state,
            destination_city: lane.destination_city || lane.destinationCity,
            destination_state: lane.destination_state || lane.destinationState,
            bill_rate: lane.bill_rate,
            margin_amount: marginAmount,
            margin_percent: marginPercent,
            covered_at: new Date().toISOString()
        };

        const { data: coveredLoad, error: insertError } = await supabase
            .from('covered_loads')
            .insert(coveredLoadData)
            .select()
            .single();

        if (insertError) {
            console.error('[archiveService] Failed to create covered_loads record:', insertError);
            return { success: false, error: 'Failed to save carrier information' };
        }

        // Step 2b: Update lane with reference to covered load and set status to archived
        const { error: updateError } = await supabase
            .from('lanes')
            .update({
                status: 'archived',
                last_covered_load_id: coveredLoad.id
            })
            .eq('id', laneId);

        if (updateError) {
            console.error('[archiveService] Failed to update lane:', updateError);
            // Attempt to rollback covered_loads insert
            await supabase.from('covered_loads').delete().eq('id', coveredLoad.id);
            return { success: false, error: 'Failed to archive lane' };
        }

        return {
            success: true,
            covered: true,
            coveredLoadId: coveredLoad.id,
            laneId: laneId,
            carrierMemory: {
                carrier_name: carrierData.carrier_name,
                carrier_mc: carrierData.carrier_mc,
                pay_rate: carrierData.pay_rate || null,
                margin_percent: marginPercent
            },
            message: `Lane archived. Covered by ${carrierData.carrier_name} (${carrierData.carrier_mc})`
        };
    }

    // Step 3: If not covered, just archive the lane
    const { error: archiveError } = await supabase
        .from('lanes')
        .update({ status: 'archived' })
        .eq('id', laneId);

    if (archiveError) {
        console.error('[archiveService] Failed to archive lane:', archiveError);
        return { success: false, error: 'Failed to archive lane' };
    }

    return {
        success: true,
        covered: false,
        laneId: laneId,
        message: 'Lane archived without coverage data'
    };
}

/**
 * Fetch Carrier Memory for a lane.
 * Finds previous coverage on the same or similar lane.
 * 
 * @param {Object} lane - Lane object or lane match criteria
 * @param {string} [lane.id] - Lane ID to check for direct coverage
 * @param {string} lane.origin_city - Origin city
 * @param {string} lane.origin_state - Origin state
 * @param {string} lane.destination_city - Destination city
 * @param {string} lane.destination_state - Destination state
 * @returns {Object|null} Previous carrier info or null
 */
export async function getCarrierMemory(lane) {
    const supabase = await getSupabaseAdmin();

    // Option 1: Check if lane has a direct covered_load reference
    if (lane.last_covered_load_id) {
        const { data: directMatch } = await supabase
            .from('covered_loads')
            .select('*')
            .eq('id', lane.last_covered_load_id)
            .single();

        if (directMatch) {
            return {
                ...directMatch,
                matchType: 'direct'
            };
        }
    }

    // Option 2: Look for similar lane coverage (same origin/destination pattern)
    const originCity = lane.origin_city;
    const originState = lane.origin_state;
    const destCity = lane.destination_city || lane.destinationCity;
    const destState = lane.destination_state || lane.destinationState;

    if (!originCity || !originState || !destCity || !destState) {
        return null;
    }

    const { data: similarMatch } = await supabase
        .from('covered_loads')
        .select('*')
        .ilike('origin_city', originCity)
        .eq('origin_state', originState)
        .ilike('destination_city', destCity)
        .eq('destination_state', destState)
        .order('covered_at', { ascending: false })
        .limit(1)
        .single();

    if (similarMatch) {
        return {
            ...similarMatch,
            matchType: 'pattern'
        };
    }

    return null;
}

/**
 * Get all coverage history for a specific carrier MC.
 * 
 * @param {string} carrierMc - Carrier MC number
 * @param {number} limit - Max records to return
 * @returns {Object[]} Array of covered_loads records
 */
export async function getCarrierHistory(carrierMc, limit = 20) {
    if (!carrierMc) return [];

    const supabase = await getSupabaseAdmin();

    const { data, error } = await supabase
        .from('covered_loads')
        .select('*')
        .eq('carrier_mc', carrierMc.trim())
        .order('covered_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('[archiveService] Error fetching carrier history:', error);
        return [];
    }

    return data || [];
}

/**
 * Log an interaction (call or email) for a lane.
 * Used by Traction Tracker feature.
 * 
 * @param {string} laneId - Lane ID
 * @param {string} interactionType - 'call' or 'email'
 * @param {Object} [details] - Optional interaction details
 * @returns {Object} Result of interaction logging
 */
export async function logInteraction(laneId, interactionType, details = {}) {
    if (!laneId) {
        return { success: false, error: 'Lane ID is required' };
    }

    if (!['call', 'email'].includes(interactionType)) {
        return { success: false, error: 'Interaction type must be "call" or "email"' };
    }

    const supabase = await getSupabaseAdmin();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'Authentication required' };
    }

    const interactionData = {
        lane_id: laneId,
        user_id: user.id,
        interaction_type: interactionType,
        carrier_mc: details.carrier_mc || null,
        carrier_name: details.carrier_name || null,
        carrier_phone: details.carrier_phone || null,
        carrier_email: details.carrier_email || null,
        outcome: details.outcome || 'pending',
        notes: details.notes || null
    };

    const { data, error } = await supabase
        .from('load_interactions')
        .insert(interactionData)
        .select()
        .single();

    if (error) {
        console.error('[archiveService] Failed to log interaction:', error);
        return { success: false, error: 'Failed to log interaction' };
    }

    return {
        success: true,
        interactionId: data.id,
        type: interactionType,
        laneId: laneId
    };
}

/**
 * Get interaction history for a lane.
 * 
 * @param {string} laneId - Lane ID
 * @returns {Object[]} Array of load_interactions records
 */
export async function getInteractionsForLane(laneId) {
    if (!laneId) return [];

    const supabase = await getSupabaseAdmin();

    const { data, error } = await supabase
        .from('load_interactions')
        .select('*')
        .eq('lane_id', laneId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[archiveService] Error fetching interactions:', error);
        return [];
    }

    return data || [];
}

/**
 * Get interaction counts for a lane (for Traction Tracker display).
 * 
 * @param {string} laneId - Lane ID
 * @returns {Object} { calls: number, emails: number }
 */
export async function getInteractionCounts(laneId) {
    if (!laneId) return { calls: 0, emails: 0 };

    const supabase = await getSupabaseAdmin();

    const { data, error } = await supabase
        .from('load_interactions')
        .select('interaction_type')
        .eq('lane_id', laneId);

    if (error || !data) {
        return { calls: 0, emails: 0 };
    }

    return {
        calls: data.filter(i => i.interaction_type === 'call').length,
        emails: data.filter(i => i.interaction_type === 'email').length
    };
}

export default {
    handleSmartArchive,
    getCarrierMemory,
    getCarrierHistory,
    logInteraction,
    getInteractionsForLane,
    getInteractionCounts
};
