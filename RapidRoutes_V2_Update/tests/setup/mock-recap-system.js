// tests/setup/mock-recap-system.js
import { vi } from 'vitest';

vi.mock('../../lib/RecapSystem.js', () => {
  return {
    RecapSystem: class MockRecapSystem {
      constructor() {
        this.supabase = vi.fn();
      }

      async generateRecap(laneId) {
        return {
          id: 'test-recap-id',
          lane_id: laneId,
          insights: [
            'High volume lane with consistent demand',
            'Strong carrier relationships in both markets',
            'Multiple backup carriers available'
          ],
          generated_at: new Date().toISOString()
        };
      }

      async exportRecapCSV(laneId) {
        return 'RR Number,Origin,Destination,Equipment,Weight\nRR10001,Chicago IL,Atlanta GA,V,45000';
      }
    }
  };
});
