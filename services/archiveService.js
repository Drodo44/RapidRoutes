// File: src/services/archiveService.js
// RapidRoutes 2.0 - Smart Archive Service
// Purpose: Handle Smart Archive workflow with Carrier Memory

import supabase from '@/utils/supabaseClient';
import { archiveLaneCovered } from '@/lib/laneIntelligenceService';

/**
 * Lazy import of Supabase admin client to avoid bundling in client-side code.
 */
async function getSupabaseAdmin() {
    const mod = await import("@/lib/supabaseAdmin");
    return mod.default;
}

/**
 * Smart Archive workflow handler.
 * 
 * When user archives a load:
 * 1. If covered: writes canonical coverage in carrier_coverage via archiveLaneCovered
 * 2. If not covered: archives lane lifecycle state only (mirror update on lanes)
 * 
 * This enables "Carrier Memory" - tracking who covered which lanes at what rate.
 * 
 * @param {string} laneId - UUID of the lane being archived
 * @param {Object|null} carrierData - Carrier info if load was covered, null if not
 * @param {boolean} carrierData.covered - True if load was covered
 * @param {string} carrierData.carrier_mc - Carrier MC number (required if covered)
 * @param {string} [carrierData.carrier_name] - Carrier name (optional display field)
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
    if (!laneId) {
        return { success: false, error: 'Lane ID is required' };
    }
    if (!supabase) {
        return { success: false, error: 'Authentication client unavailable' };
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const user = session?.user || null;
    if (sessionError || !user) {
        return { success: false, error: 'Authentication required' };
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();
    if (profileError) {
        console.warn('[archiveService] Unable to resolve organization from profile:', profileError.message);
    }

    const organizationId =
        profile?.organization_id ||
        user?.user_metadata?.organization_id ||
        user?.app_metadata?.organization_id ||
        null;
    const wasCovered = carrierData?.covered === true;

    if (wasCovered) {
        const mcNumber = String(carrierData?.carrier_mc || '').trim();
        const carrierEmail = String(carrierData?.carrier_email || '').trim().toLowerCase();
        const rateCovered = Number.parseFloat(String(carrierData?.pay_rate));

        if (!mcNumber || !carrierEmail || !Number.isFinite(rateCovered) || rateCovered <= 0) {
            return { success: false, error: 'Carrier MC, carrier email, and valid pay rate are required' };
        }

        const canonicalArchive = await archiveLaneCovered(
            laneId,
            { mc: mcNumber, email: carrierEmail, rate: rateCovered },
            user.id,
            organizationId
        );

        if (!canonicalArchive.success) {
            return canonicalArchive;
        }

        const { error: laneMirrorError } = await supabase
            .from('lanes')
            .update({
                lane_status: 'archive',
                covered_at: new Date().toISOString(),
            })
            .eq('id', laneId)
            .eq('organization_id', organizationId)
            .select('id')
            .single();

        if (laneMirrorError) {
            console.error('[archiveService] Failed to mirror covered archive lifecycle on lanes:', laneMirrorError);
            return { success: false, error: 'Failed to archive lane lifecycle state' };
        }

        return {
            success: true,
            covered: true,
            laneId,
            canonical: true,
            warnings: canonicalArchive.warnings || [],
            message: `Lane archived. Covered by carrier ${mcNumber}`
        };
    }

    // Non-covered archive: lifecycle mirror only (no canonical coverage write).
    const { error: archiveError } = await supabase
        .from('lanes')
        .update({ lane_status: 'archive' })
        .eq('id', laneId)
        .eq('organization_id', organizationId)
        .select('id')
        .single();
    if (archiveError) {
        console.error('[archiveService] Failed to archive lane without coverage:', archiveError);
        return { success: false, error: 'Failed to archive lane' };
    }

    return {
        success: true,
        covered: false,
        laneId,
        canonical: true,
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
