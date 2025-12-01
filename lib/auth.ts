import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Get authenticated user information from API request
 * Returns user, profile, and session information or null if not authenticated
 */
export async function getAuthFromRequest(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check for internal bypass first
    if (isInternalBypass(req)) {
      console.log('[getAuthFromRequest] Internal bypass granted');
      return {
        user: { id: 'test-user-id' },
        profile: { role: 'Admin', active: true, status: 'approved', organization_id: null }
      };
    }

    // Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;
    const authToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!authToken) {
      return null;
    }

    // Import supabaseAdmin dynamically to avoid circular dependencies
    let supabaseAdmin;
    try {
      const module = await import('./supabaseAdmin.js');
      supabaseAdmin = module.default || module.adminSupabase;
    } catch (e) {
      console.error('[getAuthFromRequest] Admin client import failed:', e?.message || e);
      return null;
    }

    // Validate the token and get user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authToken);

    if (userError || !user) {
      console.error('[getAuthFromRequest] Invalid token:', userError?.message || 'No user');
      return null;
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[getAuthFromRequest] Profile lookup failed:', profileError?.message || 'No profile');
      return null;
    }

    // Check if user is active and approved
    if (!profile.active || profile.status !== 'approved') {
      console.warn('[getAuthFromRequest] User not active or approved:', { active: profile.active, status: profile.status });
      return null;
    }

    return {
      user,
      profile,
      userId: user.id,
      id: user.id
    };
  } catch (error) {
    console.error('[getAuthFromRequest] Exception:', error);
    return null;
  }
}

export function isInternalBypass(req: NextApiRequest): boolean {
  const prodBypassEnabled = process.env.INTERNAL_TEST_BYPASS === '1';

  if (!process.env.__RAPIDROUTES_BYPASS_LOGGED) {
    console.log('[auth] Bypass env state', {
      nodeEnv: process.env.NODE_ENV,
      prodBypassEnabled
    });
    process.env.__RAPIDROUTES_BYPASS_LOGGED = '1';
  }

  if (process.env.NODE_ENV === 'production' && !prodBypassEnabled) {
    if (process.env.INTERNAL_TEST_TOKEN) {
      console.warn('[auth] Internal bypass disabled because NODE_ENV=production', {
        prodBypassEnabled
      });
    }
    return false;
  }
  const expected = process.env.INTERNAL_TEST_TOKEN?.trim();
  if (!expected) return false;

  const gotRaw =
    (req.headers['x-internal-test'] as string | undefined) ??
    (req.headers['x-rapidroutes-test'] as string | undefined);
  const got = gotRaw?.trim();

  if (expected && !got) {
    console.warn('[auth] Internal bypass header missing', {
      headerKeys: Object.keys(req.headers),
      nodeEnv: process.env.NODE_ENV,
      prodBypassEnabled
    });
  }

  if (got && got !== expected) {
    console.warn('[auth] Internal bypass token mismatch', {
      expectedLength: expected.length,
      providedLength: got.length,
      prodBypassEnabled
    });
  }

  return Boolean(got && got === expected);
}

export function assertApiAuth(req: NextApiRequest): void {
  const bypass = isInternalBypass(req);
  if (bypass) {
    console.log('[auth] Internal bypass granted for request');
    return;
  }

  const authHeader = req.headers.authorization || '';
  if (typeof authHeader !== 'string' || !authHeader.toLowerCase().startsWith('bearer ')) {
    console.warn('[auth] Unauthorized request blocked', {
      nodeEnv: process.env.NODE_ENV,
      hasAuthHeader: Boolean(authHeader),
      internalTokenConfigured: Boolean(process.env.INTERNAL_TEST_TOKEN)
    });
    const err: Error & { status?: number } = new Error('No auth token provided');
    err.status = 401;
    throw err;
  }
}
