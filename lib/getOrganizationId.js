/**
 * Get the organization_id for a given user ID
 * Used to tag data with the correct team/organization when creating records
 * 
 * @param {Object} supabase - Supabase admin client
 * @param {string} userId - User's UUID
 * @returns {Promise<string|null>} Organization ID or null
 */
export async function getOrganizationId(supabase, userId) {
  if (!userId) {
    console.error('[getOrganizationId] No userId provided');
    return null;
  }

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[getOrganizationId] Error fetching profile:', error.message);
      return null;
    }

    if (!profile?.organization_id) {
      console.warn('[getOrganizationId] No organization_id found for user:', userId);
      return null;
    }

    return profile.organization_id;
  } catch (err) {
    console.error('[getOrganizationId] Unexpected error:', err.message);
    return null;
  }
}
