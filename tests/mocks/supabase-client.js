// tests/mocks/supabase-client.js
import { vi } from 'vitest';
import { MOCK_CITIES, MOCK_LANES } from '../mock-data.js';

// Mock data store
export const mockData = {
    lanes: MOCK_LANES,
    reference_numbers: [{
        id: 'test-ref-id',
        number: 'TEST_LANE_001',
        lane_id: '00000000-0000-0000-0000-000000000001',
        created_at: '2024-02-29T00:00:00Z'
    }],
    cities: MOCK_CITIES,
    recaps: [{
        id: 'test-recap-id',
        lane_id: '00000000-0000-0000-0000-000000000001',
        insights: ['Test insight'],
        postings: [{
            created_at: '2024-02-29T00:00:00Z',
            origin_city: 'Cincinnati',
            origin_state: 'OH',
            dest_city: 'Chicago',
            dest_state: 'IL',
            equipment_code: 'V',
            weight_lbs: 42000,
            reference_id: 'TEST_LANE_001'
        }],
        created_at: '2024-02-29T00:00:00Z'
    }]
};

// Query builder class
class QueryBuilder {
    constructor(table) {
        this.table = table;
        this.filters = [];
        this.ordering = null;
        this.limitVal = null;
        this.selectedCols = '*';
    }

    // Query methods
    select(cols = '*') {
        this.selectedCols = cols;
        return this;
    }

    eq(col, val) {
        this.filters.push({ type: 'eq', col, val });
        return this;
    }

    ilike(col, pattern) {
        this.filters.push({ type: 'ilike', col, pattern });
        return this;
    }

    not(col, op, val) {
        this.filters.push({ type: 'not', col, op, val });
        return this;
    }

    order(col, { ascending = true } = {}) {
        this.ordering = { col, ascending };
        return this;
    }

    limit(n) {
        this.limitVal = n;
        return this;
    }

    // Execution methods
    async single() {
        const results = this._executeQuery();
        return { data: results[0] || null, error: null };
    }

    then(cb) {
        const results = this._executeQuery();
        cb({ data: results, error: null });
        return Promise.resolve({ data: results, error: null });
    }

    // Insert and update operations
    insert(data) {
        const newData = Array.isArray(data) ? data : [data];
        const insertedData = newData.map(item => ({
            ...item,
            id: item.id || `mock-${this.table}-id-${Date.now()}`
        }));
        
        mockData[this.table] = mockData[this.table] || [];
        mockData[this.table].push(...insertedData);

        return {
            select: () => ({
                single: async () => ({
                    data: insertedData[0],
                    error: null
                })
            })
        };
    }

    update(data) {
        return {
            eq: (col, val) => ({
                then: async (cb) => {
                    // Find and update the record
                    const index = mockData[this.table].findIndex(item => item[col] === val);
                    if (index >= 0) {
                        mockData[this.table][index] = {
                            ...mockData[this.table][index],
                            ...data
                        };
                        const result = mockData[this.table][index];
                        cb({ data: result, error: null });
                        return { data: result, error: null };
                    } else {
                        const err = new Error(`Record not found: ${this.table}[${col}=${val}]`);
                        cb({ data: null, error: err });
                        return { data: null, error: err };
                    }
                }
            })
        };
    }

    // Private helper to execute the query with filters
    _executeQuery() {
        let results = mockData[this.table] || [];

        // Apply filters
        results = results.filter(row =>
            this.filters.every(f => {
                switch (f.type) {
                    case 'eq':
                        return row[f.col] === f.val;
                    case 'ilike':
                        return String(row[f.col])
                            .toLowerCase()
                            .includes(f.pattern.replace(/%/g, '').toLowerCase());
                    case 'not':
                        if (f.op === 'eq') return row[f.col] !== f.val;
                        return true;
                    default:
                        return true;
                }
            })
        );

        // Apply ordering
        if (this.ordering) {
            results.sort((a, b) => {
                if (this.ordering.ascending) {
                    return a[this.ordering.col] > b[this.ordering.col] ? 1 : -1;
                }
                return a[this.ordering.col] < b[this.ordering.col] ? 1 : -1;
            });
        }

        // Apply limit
        if (this.limitVal) {
            results = results.slice(0, this.limitVal);
        }

        return results;
    }
}

// Create mock Supabase client
export const mockSupabaseClient = {
    from: (table) => new QueryBuilder(table)
};

// Create mock for @supabase/supabase-js
export const mockSupabaseJS = {
    createClient: () => mockSupabaseClient
};

// Utility function to reset test data
export function resetMockData() {
    // Reset mock data to initial state
    Object.assign(mockData, {
        lanes: [...MOCK_LANES],
        reference_numbers: [{
            id: 'test-ref-id',
            number: 'TEST_LANE_001',
            lane_id: '00000000-0000-0000-0000-000000000001',
            created_at: '2024-02-29T00:00:00Z'
        }],
        cities: [...MOCK_CITIES],
        recaps: [{
            id: 'test-recap-id',
            lane_id: '00000000-0000-0000-0000-000000000001',
            insights: ['Test insight'],
            postings: [{
                created_at: '2024-02-29T00:00:00Z',
                origin_city: 'Cincinnati',
                origin_state: 'OH',
                dest_city: 'Chicago',
                dest_state: 'IL',
                equipment_code: 'V',
                weight_lbs: 42000,
                reference_id: 'TEST_LANE_001'
            }],
            created_at: '2024-02-29T00:00:00Z'
        }]
    });
}

// Vi mock for Supabase
vi.mock('@supabase/supabase-js', () => mockSupabaseJS);
