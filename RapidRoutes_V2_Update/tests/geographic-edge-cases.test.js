import { describe, test, expect } from 'vitest';
import { generateDiversePairs } from '../lib/geographic-intelligence.js';
import { MOCK_CITIES } from './mock-data.js';

describe('Geographic Intelligence - Edge Cases', () => {
    describe('Border City Tests', () => {
        test('handles cities near state borders correctly', async () => {
            const result = await generateDiversePairs({
                origin: {
                    city: 'Cincinnati',
                    state: 'OH',
                    latitude: 39.1031,
                    longitude: -84.5120,
                    kma_code: 'CVG'
                },
                destination: {
                    city: 'Covington',
                    state: 'KY',
                    latitude: 39.0837,
                    longitude: -84.5085,
                    kma_code: 'CVG'
                },
                equipment: 'V',
                maxPickupDistance: 75,
                maxDeliveryDistance: 75
            });

            expect(result.pairs.length).toBeGreaterThan(0);
            // Verify state crossover
            expect(result.pairs.some(p => p.pickup.state !== 'OH')).toBe(true);
            expect(result.pairs.some(p => p.delivery.state !== 'KY')).toBe(true);
        });

        test('respects exact 75-mile radius limit', async () => {
            const result = await generateDiversePairs({
                origin: MOCK_CITIES[0],
                destination: MOCK_CITIES[1],
                equipment: 'V',
                maxPickupDistance: 75,
                maxDeliveryDistance: 75
            });

            for (const pair of result.pairs) {
                expect(pair.distances.pickup).toBeLessThanOrEqual(75);
                expect(pair.distances.delivery).toBeLessThanOrEqual(75);
            }
        });
    });

    describe('KMA Diversity Requirements', () => {
        test('maintains minimum KMA diversity even with tight radius', async () => {
            const result = await generateDiversePairs({
                origin: MOCK_CITIES[0],
                destination: MOCK_CITIES[1],
                equipment: 'V',
                maxPickupDistance: 50,
                maxDeliveryDistance: 50,
                preferFillTo10: true
            });

            const pickupKMAs = new Set(result.pairs.map(p => p.pickup.kma_code));
            const deliveryKMAs = new Set(result.pairs.map(p => p.delivery.kma_code));

            expect(pickupKMAs.size).toBeGreaterThanOrEqual(2);
            expect(deliveryKMAs.size).toBeGreaterThanOrEqual(2);
        });

        test('prioritizes KMA diversity over distance when possible', async () => {
            const result = await generateDiversePairs({
                origin: MOCK_CITIES[0],
                destination: MOCK_CITIES[1],
                equipment: 'V',
                maxPickupDistance: 75,
                maxDeliveryDistance: 75,
                preferKMADiversity: true
            });

            const pickupKMAs = new Set(result.pairs.map(p => p.pickup.kma_code));
            const deliveryKMAs = new Set(result.pairs.map(p => p.delivery.kma_code));

            expect(pickupKMAs.size).toBeGreaterThanOrEqual(3);
            expect(deliveryKMAs.size).toBeGreaterThanOrEqual(3);
        });
    });

    describe('Performance with Large Datasets', () => {
        test('handles maximum row generation efficiently', async () => {
            const startTime = Date.now();
            const result = await generateDiversePairs({
                origin: MOCK_CITIES[0],
                destination: MOCK_CITIES[1],
                equipment: 'V',
                maxPickupDistance: 75,
                maxDeliveryDistance: 75,
                preferFillTo10: true
            });

            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(1000); // Should complete in under 1 second
            expect(result.pairs.length).toBe(10);
        });
    });
});
