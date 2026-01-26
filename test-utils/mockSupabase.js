// test-utils/mockSupabase.js
export const mockSupabaseClient = {
    from: jest.fn(() => mockSupabaseClient),
    select: jest.fn(() => mockSupabaseClient),
    insert: jest.fn(() => mockSupabaseClient),
    update: jest.fn(() => mockSupabaseClient),
    delete: jest.fn(() => mockSupabaseClient),
    eq: jest.fn(() => mockSupabaseClient),
    single: jest.fn(() => mockSupabaseClient),
    order: jest.fn(() => mockSupabaseClient),
    limit: jest.fn(() => mockSupabaseClient),
    then: jest.fn(() => Promise.resolve({ data: [], error: null }))
};

export const mockSupabaseUrl = 'http://localhost:54321';
export const mockSupabaseKey = 'test-anon-key';
