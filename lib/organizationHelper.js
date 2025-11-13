// lib/organizationHelper.js
// Helper functions for team/organization management

import { adminSupabase as supabase } from './supabaseAdmin.js';

/**
 * Get the organization_id for a user
 * @param {string} userId - The user's UUID
 * @returns {Promise<string|null>} The organization_id or null if not found
 */
export async function getUserOrganizationId(userId) {
  if (!userId) {
    console.error('[organizationHelper] No userId provided');
    return null;
  }

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[organizationHelper] Error fetching organization_id:', error.message);
      return null;
    }

    return profile?.organization_id || null;
  } catch (err) {
    console.error('[organizationHelper] Exception fetching organization_id:', err.message);
    return null;
  }
}

/**
 * Get full profile info including organization and role
 * @param {string} userId - The user's UUID
 * @returns {Promise<object|null>} Profile object or null
 */
export async function getUserProfile(userId) {
  if (!userId) {
    console.error('[organizationHelper] No userId provided');
    return null;
  }

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, role, organization_id, team_role, status')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[organizationHelper] Error fetching profile:', error.message);
      return null;
    }

    return profile;
  } catch (err) {
    console.error('[organizationHelper] Exception fetching profile:', err.message);
    return null;
  }
}
