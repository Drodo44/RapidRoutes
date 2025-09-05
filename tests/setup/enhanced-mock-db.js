import { MOCK_CITIES, MOCK_LANES } from '../mock-data.js';

function makeChainable(filtered, baseFilter = () => true) {
    return {
        data: filtered,
        error: null,
        not: (column, operator, value) => {
            const nextFilter = item => baseFilter(item) && 
                operator === 'is' ? item[column] !== value : true;
            return makeChainable(filtered.filter(nextFilter), nextFilter);
        },
        neq: (column, value) => {
            const nextFilter = item => baseFilter(item) && item[column] !== value;
            return makeChainable(filtered.filter(nextFilter), nextFilter);
        },
        eq: (column, value) => {
            const nextFilter = item => baseFilter(item) && item[column] === value;
            return makeChainable(filtered.filter(nextFilter), nextFilter);
        },
        lt: (column, value) => {
            const nextFilter = item => baseFilter(item) && item[column] < value;
            return makeChainable(filtered.filter(nextFilter), nextFilter);
        },
        gt: (column, value) => {
            const nextFilter = item => baseFilter(item) && item[column] > value;
            return makeChainable(filtered.filter(nextFilter), nextFilter);
        },
        gte: (column, value) => {
            const nextFilter = item => baseFilter(item) && item[column] >= value;
            return makeChainable(filtered.filter(nextFilter), nextFilter);
        },
        lte: (column, value) => {
            const nextFilter = item => baseFilter(item) && item[column] <= value;
            return makeChainable(filtered.filter(nextFilter), nextFilter);
        },
        limit: (n) => makeChainable(filtered.slice(0, n), baseFilter),
        single: () => Promise.resolve({
            data: filtered.length > 0 ? filtered[0] : [],
            error: null
        })
    };
}

export function createMockDatabase() {
    return {
        from: (table) => ({
            select: (columns = '*') => {
                let data;
                if (table === 'cities') {
                    data = MOCK_CITIES.map(city => ({
                        ...city,
                        state: city.state_or_province // Ensure state field exists
                    }));
                } else if (table === 'lanes') {
                    data = MOCK_LANES;
                } else {
                    data = [];
                }
                return makeChainable(data);
            },
            insert: (rows) => Promise.resolve({
                data: Array.isArray(rows) ? rows : [rows],
                error: null
            }),
            upsert: (rows) => Promise.resolve({
                data: Array.isArray(rows) ? rows : [rows],
                error: null
            }),
            remove: () => ({
                match: (criteria) => Promise.resolve({
                    data: [],
                    error: null
                })
            }),
            match: (criteria) => {
                const data = table === 'cities' ? 
                    MOCK_CITIES.map(city => ({
                        ...city,
                        state: city.state_or_province
                    })).filter(c => Object.entries(criteria)
                        .every(([key, value]) => c[key] === value)) :
                    table === 'lanes' ? 
                    MOCK_LANES.filter(l => Object.entries(criteria)
                        .every(([key, value]) => l[key] === value)) : [];
                return Promise.resolve({
                    data,
                    error: null
                });
            }
        }),
        rpc: (func, params) => {
            if (func === 'get_nearby_cities') {
                const { lat, lon, radius } = params;
                return Promise.resolve({
                    data: MOCK_CITIES.map(city => ({
                        ...city,
                        state: city.state_or_province,
                        distance: Math.random() * radius
                    })),
                    error: null
                });
            }
            return Promise.resolve({ data: [], error: null });
        }
    };
}
