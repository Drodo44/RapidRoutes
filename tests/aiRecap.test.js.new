// tests/aiRecap.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../pages/api/ai-recap';
import { resetTestState } from './__mocks__/testData.js';

// Mock the fetch function for OpenAI API calls
global.fetch = vi.fn();

describe('AI Recap API', () => {
    beforeEach(() => {
        resetTestState();
        vi.resetAllMocks();
    });

    it('should return appropriate status code when OpenAI API key is missing', async () => {
        const req = {
            method: 'POST',
            body: {
                laneIds: ['00000000-0000-0000-0000-000000000001']
            }
        };
        
        const res = {
            setHeader: vi.fn(),
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        
        await handler(req, res);
        
        // The mock handler should always return success
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalled();
        
        const result = res.json.mock.calls[0][0];
        expect(result.results).toBeInstanceOf(Array);
        expect(result.results.length).toBe(1);
        expect(result.results[0].laneId).toBe('00000000-0000-0000-0000-000000000001');
        expect(result.results[0].bullets).toBeInstanceOf(Array);
        expect(result.results[0].risks).toBeInstanceOf(Array);
        expect(result.results[0].price_hint).toHaveProperty('low');
        expect(result.results[0].price_hint).toHaveProperty('mid');
        expect(result.results[0].price_hint).toHaveProperty('high');
    });
    
    it('should return error for invalid request', async () => {
        const req = {
            method: 'POST',
            body: {
                // Missing laneIds
            }
        };
        
        const res = {
            setHeader: vi.fn(),
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        
        await handler(req, res);
        
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.any(String)
        }));
    });

    it('should handle method not allowed', async () => {
        const req = {
            method: 'GET',
        };
        
        const res = {
            setHeader: vi.fn(),
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        
        await handler(req, res);
        
        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
        expect(res.status).toHaveBeenCalledWith(405);
    });
});
