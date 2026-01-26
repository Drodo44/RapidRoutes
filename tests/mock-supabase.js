// tests/mock-supabase.js
import { vi } from 'vitest';

// Mock Supabase client
vi.mock('../utils/supabaseClient.js', () => ({
    supabase: {
        from: (table) => ({
            select: () => ({
                eq: () => ({
                    single: () => ({
                        data: null,
                        error: null
                    })
                })
            }),
            insert: (data) => ({
                select: () => ({
                    single: () => ({
                        data: { ...data, id: 'test-id' },
                        error: null
                    })
                })
            }),
            update: () => ({
                eq: () => ({
                    data: null,
                    error: null
                })
            })
        })
    },
    adminSupabase: {
        from: (table) => ({
            select: () => ({
                eq: () => ({
                    single: () => ({
                        data: null,
                        error: null
                    })
                })
            }),
            insert: (data) => ({
                select: () => ({
                    single: () => ({
                        data: { ...data, id: 'test-id' },
                        error: null
                    })
                })
            })
        })
    }
}));
