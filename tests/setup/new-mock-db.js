// Mock Supabase client for tests
import { MOCK_CITIES, MOCK_LANES } from '../mock-data.js';

function createMockDb() {
    return {
        from: (table) => ({
            select: (columns = '*') => {
                let filteredData = table === 'cities' ? [...MOCK_CITIES] : 
                                table === 'lanes' ? [...MOCK_LANES] : [];

                const makeChainable = (data) => ({
                    data,
                    error: null,
                    not: (column, operator, value) => {
                        if (operator === 'is') {
                            filteredData = data.filter(item => item[column] !== value);
                        }
                        return makeChainable(filteredData);
                    },
                    eq: (column, value) => {
                        filteredData = data.filter(item => item[column] === value);
                        return makeChainable(filteredData);
                    },
                    neq: (column, value) => {
                        filteredData = data.filter(item => item[column] !== value);
                        return makeChainable(filteredData);
                    },
                    lt: (column, value) => {
                        filteredData = data.filter(item => item[column] < value);
                        return makeChainable(filteredData);
                    },
                    single: () => Promise.resolve({
                        data: data[0] || null,
                        error: null
                    })
                });

                return makeChainable(filteredData);
            },
            insert: (rows) => Promise.resolve({
                data: rows,
                error: null,
                then: (callback) => Promise.resolve(callback({ data: rows, error: null }))
            }),
            upsert: (rows) => Promise.resolve({
                data: rows,
                error: null,
                then: (callback) => Promise.resolve(callback({ data: rows, error: null }))
            }),
            delete: () => ({
                match: (criteria) => Promise.resolve({
                    data: [],
                    error: null,
                    then: (callback) => Promise.resolve(callback({ data: [], error: null }))
                })
            }),
            single: () => Promise.resolve({
                data: table === 'cities' ? MOCK_CITIES[0] :
                    table === 'lanes' ? MOCK_LANES[0] : null,
                error: null
            }),
            eq: (column, value) => ({
                single: () => Promise.resolve({
                    data: table === 'cities' ? 
                        MOCK_CITIES.find(c => c[column] === value) :
                        table === 'lanes' ? 
                        MOCK_LANES.find(l => l[column] === value) : null,
                    error: null
                }),
                eq: (col2, val2) => ({
                    single: () => Promise.resolve({
                        data: table === 'cities' ? 
                            MOCK_CITIES.find(c => c[column] === value && c[col2] === val2) :
                            table === 'lanes' ? 
                            MOCK_LANES.find(l => l[column] === value && l[col2] === val2) : null,
                        error: null
                    })
                })
            }),
            match: (criteria) => Promise.resolve({
                data: table === 'cities' ? 
                    MOCK_CITIES.filter(c => Object.entries(criteria)
                        .every(([key, value]) => c[key] === value)) :
                    table === 'lanes' ? 
                    MOCK_LANES.filter(l => Object.entries(criteria)
                        .every(([key, value]) => l[key] === value)) : [],
                error: null,
                then: (callback) => Promise.resolve(callback({ 
                    data: table === 'cities' ? 
                        MOCK_CITIES.filter(c => Object.entries(criteria)
                            .every(([key, value]) => c[key] === value)) :
                        table === 'lanes' ? 
                        MOCK_LANES.filter(l => Object.entries(criteria)
                            .every(([key, value]) => l[key] === value)) : [],
                    error: null
                }))
            })
        })
    };
}

export const mockSupabase = createMockDb();
