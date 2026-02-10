// lib/laneIntelligenceService.js
// Supabase handlers for intelligent lane card features

import supabase from '../utils/supabaseClient';

function isMissingColumnError(error) {
    if (!error) return false;
    const message = String(error.message || error.details || '').toLowerCase();
    return message.includes('column') && (
        message.includes('does not exist') ||
        message.includes('undefined column')
    );
}

function isMissingSpecificColumn(error, columnName) {
    if (!error || !columnName) return false;
    const message = String(error.message || error.details || '').toLowerCase();
    return isMissingColumnError(error) && message.includes(String(columnName).toLowerCase());
}

function sanitizeText(value) {
    const text = String(value || '').trim();
    return text.length ? text : null;
}

function sanitizeRate(value) {
    const parsed = Number.parseFloat(String(value));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseCityState(rawValue) {
    const text = sanitizeText(rawValue);
    if (!text) return { city: null, state: null };
    const parts = text.split(',').map((part) => sanitizeText(part));
    if (parts.length < 2) return { city: null, state: null };
    return {
        city: parts[0],
        state: parts[1],
    };
}

async function updateLaneLegacyFields(laneId, fullPayload, fallbackPayload = null) {
    const attempts = [fullPayload];
    if (fallbackPayload && Object.keys(fallbackPayload).length > 0) {
        attempts.push(fallbackPayload);
    }

    let lastError = null;
    for (let index = 0; index < attempts.length; index++) {
        const payload = attempts[index];
        const { error } = await supabase
            .from('lanes')
            .update(payload)
            .eq('id', laneId);

        if (!error) {
            if (index > 0) {
                return {
                    success: true,
                    warning: 'Legacy lane fields were partially written due to missing legacy columns.',
                };
            }
            return { success: true };
        }

        lastError = error;
        if (!isMissingColumnError(error)) {
            return { success: false, error };
        }
    }

    // Missing legacy columns should not fail canonical writes.
    if (lastError && isMissingColumnError(lastError)) {
        return {
            success: true,
            warning: 'Legacy lane fields were not written because required legacy columns are missing.',
        };
    }

    return { success: false, error: lastError };
}

/**
 * Archive a lane as covered and record carrier info
 */
export async function archiveLaneCovered(laneId, coverageData, userId, organizationId) {
    try {
        const mcNumber = sanitizeText(coverageData?.mc);
        const carrierEmail = sanitizeText(coverageData?.email)?.toLowerCase() || null;
        const rateCovered = sanitizeRate(coverageData?.rate);
        const nowIso = new Date().toISOString();

        if (!mcNumber || !carrierEmail || !rateCovered) {
            return { success: false, error: 'MC number, carrier email, and valid covered rate are required' };
        }

        // 1. Get lane details for denormalization
        const { data: lane, error: laneError } = await supabase
            .from('lanes')
            .select('*')
            .eq('id', laneId)
            .single();

        if (laneError) throw laneError;

        const originCity = (
            sanitizeText(lane.origin_city) ||
            sanitizeText(lane.originCity) ||
            sanitizeText(coverageData?.origin_city) ||
            sanitizeText(coverageData?.originCity)
        );
        const originState = (
            sanitizeText(lane.origin_state) ||
            sanitizeText(lane.originState) ||
            sanitizeText(coverageData?.origin_state) ||
            sanitizeText(coverageData?.originState)
        );

        let destCity = (
            sanitizeText(lane.dest_city) ||
            sanitizeText(lane.destination_city) ||
            sanitizeText(lane.destCity) ||
            sanitizeText(lane.destinationCity) ||
            sanitizeText(coverageData?.dest_city) ||
            sanitizeText(coverageData?.destination_city) ||
            sanitizeText(coverageData?.destCity) ||
            sanitizeText(coverageData?.destinationCity)
        );
        let destState = (
            sanitizeText(lane.dest_state) ||
            sanitizeText(lane.destination_state) ||
            sanitizeText(lane.destState) ||
            sanitizeText(lane.destinationState) ||
            sanitizeText(coverageData?.dest_state) ||
            sanitizeText(coverageData?.destination_state) ||
            sanitizeText(coverageData?.destState) ||
            sanitizeText(coverageData?.destinationState)
        );

        if ((!destCity || !destState) && Array.isArray(lane.saved_dest_cities)) {
            const firstSavedDest = lane.saved_dest_cities.find((entry) => (
                sanitizeText(entry?.city) &&
                sanitizeText(entry?.state || entry?.state_or_province)
            ));
            if (firstSavedDest) {
                destCity = destCity || sanitizeText(firstSavedDest.city);
                destState = destState || sanitizeText(firstSavedDest.state || firstSavedDest.state_or_province);
            }
        }

        if (!destCity || !destState) {
            const parsedDestination = parseCityState(lane.destination);
            destCity = destCity || parsedDestination.city;
            destState = destState || parsedDestination.state;
        }

        if (!originCity || !originState || !destCity || !destState) {
            return {
                success: false,
                error: 'Lane route is incomplete. Expected origin_city/origin_state and dest_city/dest_state (or destination_city/destination_state) before archive.',
            };
        }

        // 2. Canonical write: carrier_coverage (complete lane key required)
        const coveragePayload = {
            lane_id: laneId,
            origin_city: originCity,
            origin_state: originState,
            dest_city: destCity,
            dest_state: destState,
            mc_number: mcNumber,
            carrier_email: carrierEmail,
            rate_covered: rateCovered,
            covered_at: nowIso,
            user_id: userId,
            organization_id: organizationId || null,
        };

        const { error: coverageError } = await supabase.from('carrier_coverage').insert(coveragePayload);
        if (coverageError) {
            if (isMissingSpecificColumn(coverageError, 'covered_at')) {
                return {
                    success: false,
                    error: 'Canonical coverage write failed: carrier_coverage.covered_at column is missing.',
                };
            }
            if (
                isMissingSpecificColumn(coverageError, 'origin_city') ||
                isMissingSpecificColumn(coverageError, 'origin_state') ||
                isMissingSpecificColumn(coverageError, 'dest_city') ||
                isMissingSpecificColumn(coverageError, 'dest_state')
            ) {
                return {
                    success: false,
                    error: 'Canonical coverage write failed: carrier_coverage lane-key columns are missing.',
                };
            }
            throw coverageError;
        }

        // 3. Legacy write: lanes table coverage fields + archive status
        const laneWrite = await updateLaneLegacyFields(
            laneId,
            {
                lane_status: 'archive',
                covered_at: nowIso,
                coverage_source: 'Archive',
                updated_at: nowIso,
            },
            {
                lane_status: 'archive',
                updated_at: nowIso,
            }
        );

        if (!laneWrite.success) {
            throw laneWrite.error;
        }

        const warnings = [];
        if (laneWrite.warning) {
            warnings.push(laneWrite.warning);
            console.warn('[archiveLaneCovered] Legacy lane write warning:', laneWrite.warning);
        }

        return { success: true, warnings };
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
        const mcNumber = sanitizeText(offerData?.mc_number);
        const carrierEmail = sanitizeText(offerData?.carrier_email)?.toLowerCase() || null;
        const rateOffered = sanitizeRate(offerData?.rate_offered);
        const nowIso = new Date().toISOString();

        if (!mcNumber || !rateOffered) {
            return { success: false, error: 'MC number and valid offered rate are required' };
        }

        // Canonical write: required fields only (carrier_email remains optional)
        const requiredPayload = {
            lane_id: laneId,
            mc_number: mcNumber,
            rate_offered: rateOffered,
            created_at: nowIso,
            user_id: userId,
        };

        const offerInsertAttempts = [
            {
                ...requiredPayload,
                carrier_email: carrierEmail,
                organization_id: organizationId,
            },
            {
                ...requiredPayload,
                carrier_email: carrierEmail,
            },
            {
                ...requiredPayload,
                organization_id: organizationId,
            },
            {
                ...requiredPayload,
            },
        ];

        let offerError = null;
        for (const payload of offerInsertAttempts) {
            const { error } = await supabase.from('carrier_offers').insert(payload);
            if (!error) {
                offerError = null;
                break;
            }

            if (isMissingSpecificColumn(error, 'created_at')) {
                return {
                    success: false,
                    error: 'Canonical offer write failed: carrier_offers.created_at column is missing. Apply the Ticket 1 migration.',
                };
            }

            offerError = error;
            if (
                isMissingSpecificColumn(error, 'carrier_email') ||
                isMissingSpecificColumn(error, 'organization_id')
            ) {
                continue;
            }
            break;
        }

        if (offerError) throw offerError;

        // Legacy write: best-effort lane-level last offer fields
        const laneWrite = await updateLaneLegacyFields(laneId, {
            last_offer_mc: mcNumber,
            last_offer_email: carrierEmail,
            last_offer_rate: rateOffered,
            last_offer_at: nowIso,
            updated_at: nowIso,
        });

        if (!laneWrite.success) {
            console.warn('[addCarrierOffer] Lane legacy offer write failed:', laneWrite.error?.message || laneWrite.error);
        }

        const warnings = [];
        if (!laneWrite.success) {
            warnings.push(`Legacy lane offer fields update failed: ${laneWrite.error?.message || laneWrite.error}`);
        } else if (laneWrite.warning) {
            warnings.push(laneWrite.warning);
        }

        if (warnings.length > 0) {
            console.warn('[addCarrierOffer] Legacy lane write warning(s):', warnings.join(' | '));
        }

        return {
            success: true,
            offer: {
                mc_number: mcNumber,
                carrier_email: carrierEmail,
                rate_offered: rateOffered,
                created_at: nowIso,
            },
            warnings,
        };
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
        let { data, error } = await supabase
            .from('carrier_offers')
            .select('id, mc_number, carrier_email, rate_offered, created_at')
            .eq('lane_id', laneId)
            .order('created_at', { ascending: false });

        if (error && isMissingColumnError(error)) {
            ({ data, error } = await supabase
                .from('carrier_offers')
                .select('id, mc_number, rate_offered, created_at')
                .eq('lane_id', laneId)
                .order('created_at', { ascending: false }));
        }

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
        // Preferred source: city_performance contact log (append-only model)
        const { data: cityPerfContacts, error: cityPerfError } = await supabase
            .from('city_performance')
            .select('id, contact_method, contact_received_at, created_at')
            .eq('lane_id', laneId)
            .order('contact_received_at', { ascending: false });

        if (!cityPerfError) {
            return { success: true, contacts: cityPerfContacts || [] };
        }

        // Fallback source: legacy contacts table
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
