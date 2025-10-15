import { fetchLaneRecords } from '@/services/laneService.js';
import { logger } from '@/lib/logger';

type GetLanesOpts = { status?: string; limit?: number };

export async function getLanes({ status = 'current', limit = 50 }: GetLanesOpts = {}) {
  logger?.debug?.('getLanes start', { status, limit });
  
  try {
    const data = await fetchLaneRecords({ status, limit });
    logger?.info?.(`getLanes returned ${data?.length ?? 0} rows`);
    return data ?? [];
  } catch (error) {
    logger?.error?.('getLanes failed', error);
    throw error;
  }
}
