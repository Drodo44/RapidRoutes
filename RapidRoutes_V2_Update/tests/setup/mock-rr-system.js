// tests/setup/mock-rr-system.js
import { vi } from 'vitest';

vi.mock('../../lib/RRNumberSystem.js', () => {
  return {
    RRNumberSystem: class MockRRNumberSystem {
      constructor() {
        this.supabase = vi.fn();
        this.prefix = 'RR';
        this.numberLength = 5;
      }

      async generateNewRRNumber() {
        return 'RR10001';
      }

      async lookupByRRNumber(rrNumber) {
        return {
          id: 'test-lane-id',
          origin_city: 'Chicago',
          origin_state: 'IL',
          dest_city: 'Atlanta',
          dest_state: 'GA',
          equipment_code: 'V',
          weight_lbs: 45000,
          recap: null
        };
      }

      async associateWithLane(rrNumber, laneId) {
        return Promise.resolve();
      }
    }
  };
});
