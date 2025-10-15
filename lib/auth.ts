import type { NextApiRequest } from 'next';

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
