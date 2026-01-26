/**
 * Helper functions for safely handling auth state and token retrieval
 */

/**
 * @typedef {Object} TokenInfo
 * @property {boolean} hasToken - Whether a valid token exists
 * @property {string|null} accessToken - The access token if available
 * @property {string|null} userId - The user ID if available
 * @property {string|null} expiresAt - ISO string of when token expires
 */

export async function safeGetCurrentToken(supabase) {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data?.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function safeGetTokenInfo(supabase) {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session) {
      return { hasToken: false, accessToken: null, userId: null, expiresAt: null };
    }
    return {
      hasToken: true,
      accessToken: data.session.access_token ?? null,
      userId: data.session.user?.id ?? null,
      expiresAt: data.session.expires_at
        ? new Date(data.session.expires_at * 1000).toISOString()
        : null,
    };
  } catch {
    return { hasToken: false, accessToken: null, userId: null, expiresAt: null };
  }
}