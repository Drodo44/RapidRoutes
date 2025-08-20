// tests/aiRecap.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../pages/api/ai/recap';

// Mock the adminSupabase used in the api route
vi.mock('../utils/supabaseClient', () => {
  const mockData = {
    lanes: [
      {
        id: '00000000-0000-0000-0000-000000000001',
        origin_city: 'Cincinnati',
        origin_state: 'OH',
        dest_city: 'Chicago',
        dest_state: 'IL',
        equipment_code: 'FD',
        length_ft: 48,
        weight_lbs: 42000,
        randomize_weight: false,
        weight_min: null,
        weight_max: null,
        pickup_earliest: '8/12/2025',
        pickup_latest: '8/13/2025'
      }
    ],
    dat_maps: [
      {
        equipment: 'flatbed',
        summary: 'Flatbed demand high in Midwest, rates trending upward',
        effective_date: '2025-08-15'
      }
    ],
    rates_snapshots: [
      { id: 1, created_at: '2025-08-15T00:00:00Z' }
    ],
    rates_flat: [
      {
        snapshot_id: 1,
        equipment: 'flatbed',
        origin: 'OH',
        destination: 'IL',
        rate: 2.50
      }
    ]
  };

  return {
    adminSupabase: {
      from: (table) => ({
        select: () => ({
          in: (col, values) => ({
            limit: () => ({
              async then(resolve) {
                if (table === 'lanes') {
                  return resolve({ data: mockData.lanes.filter(lane => values.includes(lane.id)) });
                }
                return resolve({ data: [] });
              }
            })
          }),
          eq: (col, val) => ({
            order: () => ({
              limit: () => ({
                async then(resolve) {
                  if (table === 'dat_maps' && col === 'equipment') {
                    return resolve({ data: mockData.dat_maps.filter(map => map.equipment === val) });
                  }
                  return resolve({ data: [] });
                }
              }),
              limit: () => ({
                maybeSingle: async () => {
                  if (table === 'rates_snapshots') {
                    return { data: mockData.rates_snapshots[0] || null };
                  }
                  return { data: null };
                }
              })
            }),
            eq: () => ({
              limit: () => ({
                async then(resolve) {
                  if (table === 'rates_flat' && col === 'snapshot_id') {
                    return resolve({ data: mockData.rates_flat });
                  }
                  return resolve({ data: [] });
                }
              })
            })
          })
        })
      })
    }
  };
});

// Mock the fetch function for OpenAI API calls
global.fetch = vi.fn();

describe('AI Recap API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return appropriate status code when OpenAI API key is missing', async () => {
    // Save original env
    const originalEnv = process.env;
    
    // Mock environment without API key
    process.env = { ...originalEnv };
    delete process.env.OPENAI_API_KEY;
    delete process.env.LLM_API_KEY;
    
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
    
    // The handler should return a status code (either 200 for fallback or 404 if no lanes found)
    expect(res.status).toHaveBeenCalled();
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
    
    // Restore original env
    process.env = originalEnv;
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
    
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
    expect(res.status).toHaveBeenCalledWith(405);
  });
});
