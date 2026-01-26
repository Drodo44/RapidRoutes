// tests/__mocks__/testData.js

import { vi } from 'vitest';
import { datMockSupabase } from '../setup/mock-datcrawl-db.js';

export const testCities = [
    {
        city: 'Cincinnati',
        state_or_province: 'OH',
        zip: '45202',
        latitude: 39.1031,
        longitude: -84.5120,
        kma_code: 'CVG',
        kma_name: 'Cincinnati'
    },
    {
        city: 'Chicago',
        state_or_province: 'IL',
        zip: '60601',
        latitude: 41.8781,
        longitude: -87.6298,
        kma_code: 'CHI',
        kma_name: 'Chicago'
    },
    {
        city: 'Columbus',
        state_or_province: 'OH',
        zip: '43215',
        latitude: 39.9612,
        longitude: -82.9988,
        kma_code: 'CMH',
        kma_name: 'Columbus'
    }
];

// Initialize test state
const state = {
    filters: [],
    citiesLoaded: false,
    mockDataInitialized: false
};

// Set up test state and load data into mock DB
export const resetTestState = () => {
    // Reset state
    state.filters = [];
    state.citiesLoaded = false;
    state.mockDataInitialized = false;

    // Reset mock DB state directly
    datMockSupabase.DB = {
        cities: [...testCities],
        rates_snapshots: [],
        rates_flat: []
    };
    
    // Update global test state
    globalThis.testData = {
        cities: [...testCities],
        citiesLoaded: true
    };
    
    return globalThis.testData;
};

const mockSupabaseQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn((col, val) => { 
        state.filters.push({ type: 'ilike', col, val }); 
        return mockSupabaseQueryBuilder; 
    }),
    in: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    execute: vi.fn(function() {
        const cities = globalThis.testData?.cities || testCities;
        const cityF = state.filters.find(f => f.type === 'ilike' && f.col === 'city')?.val?.toLowerCase();
        const stF = state.filters.find(f => f.type === 'ilike' && f.col === 'state_or_province')?.val?.toLowerCase();
        
        let results = cities;
        if (cityF) {
            results = results.filter(c => c.city.toLowerCase() === cityF.replace(/%/g, '').toLowerCase());
        }
        if (stF) {
            results = results.filter(c => c.state_or_province.toLowerCase() === stF.replace(/%/g, '').toLowerCase());
        }
        return Promise.resolve({ data: results, error: null });
    }),
    then: vi.fn(callback => callback({ data: [], error: null }))
};

const getSupabaseMock = () => ({
    from: vi.fn((table) => ({
        select: vi.fn(() => ({
            in: vi.fn((col, values) => ({
                limit: vi.fn(() => ({
                    then: vi.fn(callback => callback({ data: [], error: null }))
                }))
            })),
            eq: vi.fn((col, val) => ({
                single: vi.fn(() => Promise.resolve({ data: null, error: null })),
                then: vi.fn(callback => callback({ data: [], error: null }))
            })),
            order: vi.fn(() => ({
                limit: vi.fn(() => ({
                    then: vi.fn(callback => callback({ data: [], error: null }))
                }))
            }))
        })),
        delete: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
        upsert: vi.fn(() => Promise.resolve({ data: [], error: null })),
        update: vi.fn(() => Promise.resolve({ data: [], error: null }))
    }))
});

export { getSupabaseMock };

// Mock Supabase client for tests
export const mockSupabase = {
    from: (table) => ({
        select: (fields) => ({
            eq: (field, value) => ({
                single: () => {
                    if (table === 'cities') {
                        const city = globalThis.testData.cities.find(
                            c => c[field] === value
                        );
                        return Promise.resolve({ data: city });
                    }
                    return Promise.resolve({ data: null });
                }
            })
        })
    })
};
