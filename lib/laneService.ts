import supabaseAdmin from '@/lib/supabaseAdmin';
import { logger } from '@/lib/logger';

type GetLanesOpts = { status?: string; limit?: number };

export async function getLanes({ status = 'current', limit = 50 }: GetLanesOpts = {}) {
  logger?.debug?.('getLanes start', { status, limit });
  
  try {
    // Query the real lanes table, not analytics sources
    let query = supabaseAdmin
      .from('lanes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.max(1, Math.min(Number(limit) || 50, 1000)));

    if (status) {
      // Map common aliases: 'archive'|'current'
      query = query.eq('lane_status', status);
    }

    const { data, error } = await query;
    if (error) {
      logger?.error?.('getLanes query failed', error);
      throw error;
    }

    logger?.info?.(`getLanes returned ${data?.length ?? 0} rows from lanes table`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    logger?.error?.('getLanes failed', error);
    throw error;
  }
}
