import { describe, it, expect } from 'vitest';
import { mockSupabase } from './new-mock-db.js';

describe('Mock Database Client', () => {
    it('supports chained not queries', async () => {
        const result = await mockSupabase
            .from('cities')
            .select()
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)
            .neq('latitude', 0)
            .neq('longitude', 0);

        expect(result.data.length).toBeGreaterThan(0);
        expect(result.error).toBeNull();
    });

    it('properly filters with chained conditions', async () => {
        const result = await mockSupabase
            .from('cities')
            .select()
            .eq('state_or_province', 'OH')
            .eq('kma_code', 'CVG');

        expect(result.data.length).toBeGreaterThan(0);
        expect(result.error).toBeNull();
    });
});
