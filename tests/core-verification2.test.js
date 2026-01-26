import { describe, test, expect, beforeAll } from 'vitest';
import { RRNumberSystem } from '../lib/RRNumberSystem.js';
import { RecapSystem } from '../lib/RecapSystem.js';
import { FreightIntelligence } from '../lib/FreightIntelligence.js';

// Import test setup and utilities
import { 
    setupTestEnv,
    TEST_CONFIG,
    TEST_CITIES,
    mockIntelligence,
    expectValidRRNumber,
    expectValidLane
} from './setup/setup2.js';

// Run test environment setup
setupTestEnv();

describe('Core System Verification', () => {
    let testLaneId;
    let testRRNumber;
    let rrNumberSystem;
    let recapSystem;

    beforeAll(() => {
        testLaneId = '00000000-0000-0000-0000-000000000001';
        testRRNumber = 'TEST_LANE_001';

        // Initialize systems with test config
        rrNumberSystem = new RRNumberSystem(TEST_CONFIG);
        recapSystem = new RecapSystem({ ...TEST_CONFIG, intelligence: mockIntelligence });
    });

    describe('RR Number System', () => {
        test('should generate valid RR numbers', async () => {
            testRRNumber = await rrNumberSystem.generateNewRRNumber();
            expectValidRRNumber(testRRNumber);
        });

        test('should associate RR number with lane', async () => {
            await rrNumberSystem.associateWithLane(testRRNumber, testLaneId);
            const lane = await rrNumberSystem.lookupByRRNumber(testRRNumber);
            expectValidLane(lane);
            expect(lane.id).toBe(testLaneId);
        });

        test('should prevent duplicate RR numbers', async () => {
            await expect(
                rrNumberSystem.associateWithLane(testRRNumber, 'another-lane-id')
            ).rejects.toThrow();
        });
    });

    describe('Recap System', () => {
        test('should generate intelligent recaps', async () => {
            const recap = await recapSystem.generateRecap(testLaneId);
            expect(recap.insights).toBeDefined();
            expect(Array.isArray(recap.insights)).toBe(true);
            expect(recap.insights.length).toBeGreaterThan(0);
        });

        test('should include RR numbers in exports', async () => {
            const csv = await recapSystem.exportRecapCSV(testLaneId);
            expect(csv).toContain('RR Number');
            expect(csv).toContain(testRRNumber);
        });

        test('should handle missing lanes gracefully', async () => {
            await expect(
                recapSystem.generateRecap('non-existent-lane')
            ).rejects.toThrow('Lane not found');
        });
    });

    describe('Intelligence System', () => {
        let intelligence;

        beforeAll(() => {
            intelligence = new FreightIntelligence(TEST_CONFIG);
        });

        test('should generate diverse pairs', async () => {
            const result = await intelligence.generateDiversePairs({
                origin: TEST_CITIES.CHICAGO,
                destination: TEST_CITIES.ATLANTA,
                equipment: 'V',
                preferFillTo10: true
            });

            expect(result.pairs).toBeDefined();
            expect(result.pairs.length).toBeGreaterThanOrEqual(6);
        });

        test('should maintain KMA diversity', async () => {
            const result = await intelligence.generateDiversePairs({
                origin: TEST_CITIES.CHICAGO,
                destination: TEST_CITIES.ATLANTA,
                equipment: 'V'
            });

            const pickupKMAs = new Set(result.pairs.map(p => p.pickup.kma_code));
            const deliveryKMAs = new Set(result.pairs.map(p => p.delivery.kma_code));

            expect(pickupKMAs.size).toBeGreaterThanOrEqual(3);
            expect(deliveryKMAs.size).toBeGreaterThanOrEqual(3);
        });

        test('should respect distance constraints', async () => {
            const result = await intelligence.generateDiversePairs({
                origin: TEST_CITIES.CHICAGO,
                destination: TEST_CITIES.ATLANTA,
                equipment: 'V',
                maxPickupDistance: 50,
                maxDeliveryDistance: 50
            });

            for (const pair of result.pairs) {
                expect(pair.distances.pickup).toBeLessThanOrEqual(50);
                expect(pair.distances.delivery).toBeLessThanOrEqual(50);
            }
        });
    });
});
