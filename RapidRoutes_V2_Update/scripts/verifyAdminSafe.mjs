// Null-safe fix for admin Supabase fallback
import { getServerSupabase } from '../lib/supabaseClient.js';

export async function verifyAdminSafe() {
  try {
    const admin = getServerSupabase();
    if (!admin) {
      console.warn('[SafeGuard] Admin client missing, skipping.');
      return { ok: false, message: 'Admin client not initialized' };
    }
    const { data, error } = await admin.from('system_health').select('id').limit(1);
    if (error) throw error;
    return { ok: true, message: 'Admin client verified' };
  } catch (err) {
    console.error('[SafeGuard] Admin check failed', err);
    return { ok: false, message: err.message };
  }
}