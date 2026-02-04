// pages/api/diagnose-admin.js
// Safe diagnostics for server-side Supabase admin initialization (no secrets exposed)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Summarize env presence without exposing values
  const envSummary = {
    has_SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
    has_NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    has_SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    has_SUPABASE_SERVICE_ROLE: Boolean(process.env.SUPABASE_SERVICE_ROLE),
    has_SERVICE_ROLE_KEY: Boolean(process.env.SERVICE_ROLE_KEY),
    node_env: process.env.NODE_ENV || 'unknown'
  };

  // Try to initialize admin client and run a tiny head-select
  let adminOk = false;
  let adminError = null;
  let urlUsed = null;
  try {
    const mod = await import('@/lib/supabaseAdmin');
    const supabaseAdmin = mod.default;
    // Touch the client with a tiny call
    const { count, error } = await supabaseAdmin
      .from('lanes')
      .select('id', { count: 'exact', head: true });
    if (error) throw error;
    adminOk = true;
    // Derive URL used through env summary
    urlUsed = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || null;
  } catch (e) {
    adminError = e?.message || String(e);
  }

  return res.status(200).json({
    ok: true,
    env: envSummary,
    admin: {
      ok: adminOk,
      error: adminError ? String(adminError) : null,
      usingUrl: Boolean(urlUsed)
    }
  });
}
