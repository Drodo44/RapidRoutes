import { vi, describe, test, expect, beforeAll, afterAll } from 'vitest';
import { rrNumberSystem } from '../lib/RRNumberSystem.js';
import { recapSystem } from '../lib/RecapSystem.js';

// Mock Supabase client
const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
};

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => mockSupabase
}));

vi.mock('../utils/supabaseClient.js', () => ({
    supabase: mockSupabase,
    supabaseUrl: 'http://localhost:54321',
    supabaseKey: 'test-key'
}));

describe('Critical System Fixes Verification', () => {
    let testLaneId;
    let testRRNumber;

    beforeAll(async () => {
        // Create test lane
        const { data: lane } = await supabase
            .from('lanes')
            .insert({
                origin_city: 'Chicago',
                origin_state: 'IL',
                dest_city: 'Atlanta',
                dest_state: 'GA',
                equipment_code: 'V',
                weight_lbs: 45000
            })
            .select()
            .single();
        
        testLaneId = lane.id;
    });

    describe('RR Number System', () => {
        test('Generates valid RR numbers', async () => {
            const rrNumber = await rrNumberSystem.generateNewRRNumber();
            expect(rrNumber).toMatch(/^RR\d{5}$/);
            testRRNumber = rrNumber;
        });

        test('Associates RR number with lane', async () => {
            await rrNumberSystem.associateWithLane(testRRNumber, testLaneId);
            const lane = await rrNumberSystem.lookupByRRNumber(testRRNumber);
            expect(lane.id).toBe(testLaneId);
        });

        test('Prevents duplicate RR numbers', async () => {
            const rrNumber1 = await rrNumberSystem.generateNewRRNumber();
            const rrNumber2 = await rrNumberSystem.generateNewRRNumber();
            expect(rrNumber1).not.toBe(rrNumber2);
        });
    });

    describe('Recap System', () => {
        test('Generates intelligent insights', async () => {
            const recap = await recapSystem.generateRecap(testLaneId);
            expect(recap.insights).toBeDefined();
            expect(Array.isArray(recap.insights)).toBe(true);
        });

        test('Insights are data-driven', async () => {
            const recap = await recapSystem.generateRecap(testLaneId);
            for (const insight of recap.insights) {
                expect(insight).toHaveProperty('type');
                expect(insight).toHaveProperty('message');
                expect(insight).toHaveProperty('data');
            }
        });

        test('CSV export includes RR numbers', async () => {
            const csv = await recapSystem.exportRecapCSV(testLaneId);
            expect(csv).toContain('RR Number');
            expect(csv).toContain(testRRNumber);
        });
    });

    describe('Integration Tests', () => {
        test('RR number appears in recap', async () => {
            const recap = await recapSystem.getRecap(testLaneId);
            expect(recap.lane.reference_id).toBe(testRRNumber);
        });

        test('Lookup works both ways', async () => {
            const laneFromRR = await rrNumberSystem.lookupByRRNumber(testRRNumber);
            const recap = await recapSystem.getRecap(laneFromRR.id);
            expect(recap.lane.id).toBe(testLaneId);
        });
    });

    afterAll(async () => {
        // Cleanup test data
        await supabase
            .from('lanes')
            .delete()
            .eq('id', testLaneId);
    });
});
