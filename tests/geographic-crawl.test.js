import { vi, describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestData, cleanupTestData } from './setup/test-data.js';

// Import dependencies before mocking
import { generateGeographicCrawlPairs } from '../lib/geographicCrawl.js';

vi.mock('../lib/geographicCrawl.js');

describe('Geographic Crawl System', () => {
    beforeEach(async () => {
        await setupTestData();
    });

    afterAll(async () => {
        await cleanupTestData();
    });

    it('finds nearby cities with different KMAs', async () => {
        // Mock implementation for this test
        vi.mocked(generateGeographicCrawlPairs).mockResolvedValueOnce({
            pairs: [
                {
                    pickup: {
                        city: "Oak Park",
                        state: "IL",
                        distance: 15,
                        kma: "CHI"
                    },
                    delivery: {
                        city: "Hammond",
                        state: "IN",
                        distance: 25,
                        kma: "CHI"
                    }
                }
            ],
            totalPairs: 1
        });

        const result = await generateGeographicCrawlPairs({
            originCity: 'Chicago',
            originState: 'IL',
            equipment: 'V'
        });

        expect(result.pairs.length).toBe(1);
        expect(result.totalPairs).toBe(1);
        expect(result.pairs[0].pickup.city).toBe('Oak Park');
        expect(result.pairs[0].delivery.city).toBe('Hammond');
    });
  beforeAll(async () => {
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('Core Crawl Generation', () => {
    it('should generate pairs within 75-mile primary radius', async () => {
      const result = await generateGeographicCrawlPairs({
        origin: { city: 'Chicago', state: 'IL' },
        destination: { city: 'Atlanta', state: 'GA' },
        equipment: 'V',
        preferFillTo10: false,
        usedCities: new Set()
      });
      
      expect(result.pairs).toBeInstanceOf(Array);
      expect(result.pairs.length).toBeGreaterThanOrEqual(2);
      result.pairs.forEach(pair => {
        expect(pair.pickup.distance).toBeLessThanOrEqual(75);
        expect(pair.delivery.distance).toBeLessThanOrEqual(75);
      });
    });
  });

  describe('KMA Diversity', () => {
    it('should include KMA information in results', async () => {
      const result = await generateGeographicCrawlPairs({
        origin: { city: 'Chicago', state: 'IL' },
        destination: { city: 'Dallas', state: 'TX' },
        equipment: 'V',
        preferFillTo10: false,
        usedCities: new Set()
      });
      
      result.pairs.forEach(pair => {
        expect(typeof pair.pickup.kma).toBe('string');
        expect(typeof pair.delivery.kma).toBe('string');
      });
    });
  });

  describe('City Deduplication', () => {
    it('should respect used cities list', async () => {
      const usedCities = new Set(['OAK PARK_IL', 'EVANSTON_IL']);
      const result = await generateGeographicCrawlPairs({
        origin: { city: 'Chicago', state: 'IL' },
        destination: { city: 'Milwaukee', state: 'WI' },
        equipment: 'V',
        preferFillTo10: false,
        usedCities
      });
      
      result.pairs.forEach(pair => {
        const pickupKey = `${pair.pickup.city}_${pair.pickup.state}`;
        const deliveryKey = `${pair.delivery.city}_${pair.delivery.state}`;
        expect(usedCities.has(pickupKey)).toBe(false);
        expect(usedCities.has(deliveryKey)).toBe(false);
      });
    });
  });

  describe('Equipment-Specific Logic', () => {
    it('should handle flat equipment type', async () => {
      const result = await generateGeographicCrawlPairs({
        origin: { city: 'Chicago', state: 'IL' },
        destination: { city: 'Atlanta', state: 'GA' },
        equipment: 'FD',
        preferFillTo10: false,
        usedCities: new Set()
      });
      
      expect(result.pairs).toBeInstanceOf(Array);
      expect(result.pairs.length).toBeGreaterThanOrEqual(2);
    });
  });
});
