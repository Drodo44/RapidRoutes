// Integration-style test of generateCrawlPairs with a mocked Supabase admin client.
// Verifies: no duplicate KMAs, respects 75/100/125 tiers (125mi candidates excluded unless very strong),
// and returns a shortfall reason when fewer than 10 unique KMA pairs exist.

// Mock Supabase admin client first to avoid hoisting issues
vi.mock('../utils/supabaseClient.js', () => {
  return {
    adminSupabase: {
      from: (table) => datMockSupabase.from(table)
    }
  };
});

// Then import test dependencies
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { generateCrawlPairs } from '../lib/datcrawl';
import { resetDatDB, datMockSupabase } from './setup/mock-dat-db.js';

beforeEach(() => {
  resetDatDB();
  vi.clearAllMocks();
});

describe('DAT Crawl Tests', () => {
  describe('Crawl generation rules', () => {
    it('returns pairs with unique KMAs per side and excludes weak 125-mile candidates', async () => {
      // Increase timeout to 30 seconds for this test
      vi.setConfig({ testTimeout: 30000 });
      const res = await generateCrawlPairs({
        origin: { city: 'Chicago', state: 'IL' }, // Use a city we know exists in mock data
        destination: { city: 'Atlanta', state: 'GA' }, // Use a city we know exists in mock data
        equipment: 'FD',
        preferFillTo10: false,
      });

      // Count should be > 0 for our test data
      expect(res.count).toBeGreaterThan(0);
      expect(res.count).toBeLessThanOrEqual(8); // we have 8 total cities in test data

      // No duplicate KMA codes on either side
      const pKMAs = new Set(res.pairs.map(p => p.pickup.kma_code));
      const dKMAs = new Set(res.pairs.map(p => p.delivery.kma_code));
      expect(pKMAs.size).toBe(res.pairs.length);
      expect(dKMAs.size).toBe(res.pairs.length);

      // Ensure far 125mi candidates (K3/L3) are not used (scores not high enough)
      for (const pr of res.pairs) {
        expect(pr.pickup.kma_code).not.toBe('K3');
        expect(pr.delivery.kma_code).not.toBe('L3');
      }

      // With <10 unique KMA per side, shortfall reason is set
      expect(res.count).toBeLessThan(10);
      expect(['insufficient_unique_kma','insufficient_unique_kma_or_low_scores']).toContain(res.shortfallReason);
    });
  });
});
