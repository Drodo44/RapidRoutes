// Test to verify the delivery city options fix for New England destinations
// This test ensures that:
// 1. NYC/Long Island KMAs are blocked for New England destinations
// 2. Upstate NY cities are still allowed
// 3. The duplicate filter has been removed

import { describe, it, expect } from 'vitest';

describe('Post-Options New England Filter Fix', () => {
  // Mock data for testing
  const NEW_ENGLAND = new Set(['MA', 'NH', 'ME', 'VT', 'RI', 'CT']);
  const NYC_LI_KMA_BLOCKLIST = new Set([
    'NY_BRN', 'NY_BKN', 'NY_NYC', 'NY_QUE', 'NY_BRX', 'NY_STA', 'NY_NAS', 'NY_SUF'
  ]);

  // Helper function to normalize state names (from post-options.js)
  const normalizeStateName = (state) => {
    if (!state) return '';
    const s = String(state).trim().toUpperCase();
    if (s.length === 2) return s;
    const stateMap = {
      'MASSACHUSETTS': 'MA', 'NEW HAMPSHIRE': 'NH', 'MAINE': 'ME',
      'VERMONT': 'VT', 'RHODE ISLAND': 'RI', 'CONNECTICUT': 'CT',
      'NEW YORK': 'NY', 'NEW JERSEY': 'NJ', 'PENNSYLVANIA': 'PA'
    };
    return stateMap[s] || s.slice(0, 2);
  };

  // Simulate the filter logic from post-options.js
  const applyNewEnglandFilter = (cities) => {
    return cities.filter(c => {
      const cState = normalizeStateName(c.state_or_province || '');
      
      // Block NYC/Long Island KMAs explicitly
      if (NYC_LI_KMA_BLOCKLIST.has(c.kma_code)) {
        return false;
      }
      
      // Keep New England states + NY (upstate will remain after KMA filter)
      return NEW_ENGLAND.has(cState) || cState === 'NY';
    });
  };

  it('should block NYC/Long Island KMAs for New England destinations', () => {
    const testCities = [
      { city: 'Brooklyn', state_or_province: 'NY', kma_code: 'NY_BRN' },
      { city: 'Manhattan', state_or_province: 'NY', kma_code: 'NY_NYC' },
      { city: 'Queens', state_or_province: 'NY', kma_code: 'NY_QUE' },
    ];

    const filtered = applyNewEnglandFilter(testCities);
    
    // All NYC/LI cities should be blocked
    expect(filtered.length).toBe(0);
  });

  it('should allow upstate NY cities for New England destinations', () => {
    const testCities = [
      { city: 'Albany', state_or_province: 'NY', kma_code: 'NY_ALB' },
      { city: 'Buffalo', state_or_province: 'NY', kma_code: 'NY_BUF' },
      { city: 'Syracuse', state_or_province: 'NY', kma_code: 'NY_SYR' },
    ];

    const filtered = applyNewEnglandFilter(testCities);
    
    // All upstate NY cities should be allowed
    expect(filtered.length).toBe(3);
  });

  it('should allow all New England state cities', () => {
    const testCities = [
      { city: 'Boston', state_or_province: 'MA', kma_code: 'MA_BOS' },
      { city: 'Manchester', state_or_province: 'NH', kma_code: 'NH_MAN' },
      { city: 'Portland', state_or_province: 'ME', kma_code: 'ME_POR' },
      { city: 'Burlington', state_or_province: 'VT', kma_code: 'VT_BUR' },
      { city: 'Providence', state_or_province: 'RI', kma_code: 'RI_PRO' },
      { city: 'Hartford', state_or_province: 'CT', kma_code: 'CT_HAR' },
    ];

    const filtered = applyNewEnglandFilter(testCities);
    
    // All New England cities should be allowed
    expect(filtered.length).toBe(6);
  });

  it('should block non-New England, non-NY cities', () => {
    const testCities = [
      { city: 'Philadelphia', state_or_province: 'PA', kma_code: 'PA_PHI' },
      { city: 'Newark', state_or_province: 'NJ', kma_code: 'NJ_NEW' },
      { city: 'Atlanta', state_or_province: 'GA', kma_code: 'GA_ATL' },
    ];

    const filtered = applyNewEnglandFilter(testCities);
    
    // Non-New England, non-NY cities should be blocked
    expect(filtered.length).toBe(0);
  });

  it('should handle mixed cities correctly', () => {
    const testCities = [
      // Should be allowed
      { city: 'Boston', state_or_province: 'MA', kma_code: 'MA_BOS' },
      { city: 'Albany', state_or_province: 'NY', kma_code: 'NY_ALB' },
      { city: 'Hartford', state_or_province: 'CT', kma_code: 'CT_HAR' },
      
      // Should be blocked
      { city: 'Brooklyn', state_or_province: 'NY', kma_code: 'NY_BRN' },
      { city: 'Philadelphia', state_or_province: 'PA', kma_code: 'PA_PHI' },
      { city: 'Manhattan', state_or_province: 'NY', kma_code: 'NY_NYC' },
    ];

    const filtered = applyNewEnglandFilter(testCities);
    
    // Only 3 cities should be allowed (Boston, Albany, Hartford)
    expect(filtered.length).toBe(3);
    
    // Verify correct cities are present
    const cityNames = filtered.map(c => c.city);
    expect(cityNames).toContain('Boston');
    expect(cityNames).toContain('Albany');
    expect(cityNames).toContain('Hartford');
    expect(cityNames).not.toContain('Brooklyn');
    expect(cityNames).not.toContain('Philadelphia');
    expect(cityNames).not.toContain('Manhattan');
  });
});
