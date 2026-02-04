// tests/mock-supabase-core.js

export const mockData = {
    lanes: [{
        id: 'test-lane-id',
        origin_city: 'Chicago',
        origin_state: 'IL',
        dest_city: 'Atlanta',
        dest_state: 'GA',
        equipment_code: 'V',
        weight_lbs: 45000
    }],
    reference_numbers: [{
        id: 'test-ref-id',
        number: 'RR10000',
        lane_id: 'test-lane-id',
        created_at: '2025-09-04T12:00:00Z'
    }],
    cities: [{
        city: 'Chicago',
        state_or_province: 'IL',
        latitude: 41.8781,
        longitude: -87.6298,
        kma_code: 'CHI'
    }, {
        city: 'Atlanta',
        state_or_province: 'GA',
        latitude: 33.7490,
        longitude: -84.3880,
        kma_code: 'ATL'
    }],
    recaps: [{
        id: 'test-recap-id',
        lane_id: 'test-lane-id',
        insights: ['Test insight'],
        postings: [{
            created_at: '2025-09-04T12:00:00Z',
            origin_city: 'Chicago',
            origin_state: 'IL',
            dest_city: 'Atlanta',
            dest_state: 'GA',
            equipment_code: 'V',
            weight_lbs: 45000,
            reference_id: 'RR10000'
        }]
    }]
};

function createQueryBuilder(table) {
    const state = {
        filters: [],
        orderBy: null,
        limit: null
    };

    function applyFilters(results) {
        return results.filter(row => 
            state.filters.every(f => {
                switch (f.type) {
                    case 'eq':
                        return row[f.field] === f.value;
                    case 'ilike':
                        return row[f.field]?.toLowerCase().includes(f.pattern.replace(/%/g, '').toLowerCase());
                    case 'not':
                        if (f.op === 'eq') return row[f.field] !== f.value;
                        return true;
                    default:
                        return true;
                }
            })
        );
    }

    function applyOrder(results) {
        if (!state.orderBy) return results;
        return [...results].sort((a, b) => {
            if (state.orderBy.ascending) {
                return a[state.orderBy.field] > b[state.orderBy.field] ? 1 : -1;
            }
            return a[state.orderBy.field] < b[state.orderBy.field] ? 1 : -1;
        });
    }

    function applyLimit(results) {
        if (!state.limit) return results;
        return results.slice(0, state.limit);
    }

    function executeQuery() {
        let results = mockData[table] || [];
        results = applyFilters(results);
        results = applyOrder(results);
        results = applyLimit(results);
        return results;
    }

    const builder = {
        select: (columns = '*') => builder,
        eq: (field, value) => {
            state.filters.push({ type: 'eq', field, value });
            return builder;
        },
        ilike: (field, pattern) => {
            state.filters.push({ type: 'ilike', field, pattern });
            return builder;
        },
        not: (field, op, value) => {
            state.filters.push({ type: 'not', field, op, value });
            return builder;
        },
        order: (field, { ascending = true } = {}) => {
            state.orderBy = { field, ascending };
            return builder;
        },
        limit: (value) => {
            state.limit = value;
            return builder;
        },
        single: async () => ({
            data: executeQuery()[0] || null,
            error: null
        }),
        then: (cb) => {
            const results = executeQuery();
            cb({ data: results, error: null });
            return Promise.resolve({ data: results, error: null });
        }
    };

    return builder;
}

export const mockSupabase = {
    from: createQueryBuilder
};
