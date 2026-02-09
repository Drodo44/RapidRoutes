// lib/laneIntelligenceService.js
// Supabase handlers for intelligent lane card features

import supabase from '../utils/supabaseClient';

/**
 * Archive a lane as covered and record carrier info
 */
export async function archiveLaneCovered(laneId, coverageData, userId, organizationId) {
    try {
        // 1. Get lane details for denormalization
        const { data: lane, error: laneError } = await supabase
            .from('lanes')
            .select('origin_city, origin_state, dest_city, dest_state')
            .eq('id', laneId)
            .single();

        if (laneError) throw laneError;

        // 2. Insert carrier coverage record
        const { error: coverageError } = await supabase
            .from('carrier_coverage')
            .insert({
                lane_id: laneId,
                origin_city: lane.origin_city,
                origin_state: lane.origin_state,
                dest_city: lane.dest_city || lane.destination_city,
                dest_state: lane.dest_state || lane.destination_state,
                mc_number: coverageData.mc,
                carrier_email: coverageData.email || null,
                rate_covered: parseFloat(coverageData.rate),
                user_id: userId,
                organization_id: organizationId,
            });

        if (coverageError) throw coverageError;

        // 3. Archive the lane
        const { error: archiveError } = await supabase
            .from('lanes')
            .update({ lane_status: 'archive' })
            .eq('id', laneId);

        if (archiveError) throw archiveError;

        return { success: true };
    } catch (error) {
        console.error('[archiveLaneCovered] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Mark lane as gave back / customer recovered
 */
export async function markLaneGaveBack(laneId, reason) {
    try {
        const { error } = await supabase
            .from('lanes')
            .update({
                lane_status: 'archive',
                gave_back_at: new Date().toISOString(),
                gave_back_reason: reason || 'No reason provided',
            })
            .eq('id', laneId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('[markLaneGaveBack] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Boost lane rate by percentage
 */
export async function boostLaneRate(laneId, percentage = 5) {
    try {
        // Get current rate
        const { data: lane, error: fetchError } = await supabase
            .from('lanes')
            .select('rate, rate_min, rate_max')
            .eq('id', laneId)
            .single();

        if (fetchError) throw fetchError;

        const boostMultiplier = 1 + (percentage / 100);
        const updates = {};

        if (lane.rate) {
            updates.rate = Math.round(parseFloat(lane.rate) * boostMultiplier);
        }
        if (lane.rate_min) {
            updates.rate_min = Math.round(parseFloat(lane.rate_min) * boostMultiplier);
        }
        if (lane.rate_max) {
            updates.rate_max = Math.round(parseFloat(lane.rate_max) * boostMultiplier);
        }

        if (Object.keys(updates).length === 0) {
            return { success: false, error: 'No rate to boost' };
        }

        const { error: updateError } = await supabase
            .from('lanes')
            .update(updates)
            .eq('id', laneId);

        if (updateError) throw updateError;
        return { success: true, newRates: updates };
    } catch (error) {
        console.error('[boostLaneRate] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Add a carrier offer to track what carriers are asking
 */
export async function addCarrierOffer(laneId, offerData, userId, organizationId) {
    try {
        const { error } = await supabase
            .from('carrier_offers')
            .insert({
                lane_id: laneId,
                mc_number: offerData.mc_number,
                rate_offered: parseFloat(offerData.rate_offered),
                user_id: userId,
                organization_id: organizationId,
            });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('[addCarrierOffer] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Toggle priority flag on lane
 */
export async function toggleLanePriority(laneId) {
    try {
        // Get current priority status
        const { data: lane, error: fetchError } = await supabase
            .from('lanes')
            .select('is_priority')
            .eq('id', laneId)
            .single();

        if (fetchError) throw fetchError;

        const { error: updateError } = await supabase
            .from('lanes')
            .update({ is_priority: !lane.is_priority })
            .eq('id', laneId);

        if (updateError) throw updateError;
        return { success: true, isPriority: !lane.is_priority };
    } catch (error) {
        console.error('[toggleLanePriority] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get carriers who've run this lane before
 */
export async function getCarriersForLane(originCity, destCity, organizationId) {
    try {
        const { data, error } = await supabase
            .from('carrier_coverage')
            .select('mc_number, carrier_email, rate_covered, covered_at')
            .eq('origin_city', originCity)
            .eq('dest_city', destCity)
            .eq('organization_id', organizationId)
            .order('covered_at', { ascending: false });

        if (error) throw error;

        // Deduplicate by MC number, keeping most recent
        const uniqueCarriers = [];
        const seen = new Set();
        for (const carrier of data || []) {
            if (!seen.has(carrier.mc_number)) {
                seen.add(carrier.mc_number);
                uniqueCarriers.push(carrier);
            }
        }

        return { success: true, carriers: uniqueCarriers };
    } catch (error) {
        console.error('[getCarriersForLane] Error:', error);
        return { success: false, carriers: [], error: error.message };
    }
}

/**
 * Get last coverage info for a lane
 */
export async function getLastCovered(originCity, destCity, organizationId) {
    try {
        const { data, error } = await supabase
            .from('carrier_coverage')
            .select('rate_covered, covered_at, mc_number')
            .eq('origin_city', originCity)
            .eq('dest_city', destCity)
            .eq('organization_id', organizationId)
            .order('covered_at', { ascending: false })
            .limit(1)
            .single();

        if (error?.code === 'PGRST116') {
            // No rows found
            return { success: true, lastCovered: null };
        }
        if (error) throw error;

        return {
            success: true,
            lastCovered: {
                date: new Date(data.covered_at).toLocaleDateString(),
                rate: data.rate_covered,
                mc: data.mc_number,
            },
        };
    } catch (error) {
        console.error('[getLastCovered] Error:', error);
        return { success: false, lastCovered: null, error: error.message };
    }
}

/**
 * Get carrier offers for a lane
 */
export async function getCarrierOffers(laneId) {
    try {
        const { data, error } = await supabase
            .from('carrier_offers')
            .select('id, mc_number, rate_offered, created_at')
            .eq('lane_id', laneId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, offers: data || [] };
    } catch (error) {
        console.error('[getCarrierOffers] Error:', error);
        return { success: false, offers: [], error: error.message };
    }
}

/**
 * Get contacts logged for a lane (for hot lane detection)
 */
export async function getContactsForLane(laneId) {
    try {
        const { data, error } = await supabase
            .from('contacts')
            .select('id, contact_method, created_at')
            .eq('lane_id', laneId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, contacts: data || [] };
    } catch (error) {
        console.error('[getContactsForLane] Error:', error);
        return { success: false, contacts: [], error: error.message };
    }
}
