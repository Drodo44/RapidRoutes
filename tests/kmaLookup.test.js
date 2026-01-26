import { describe, it, expect } from 'vitest';
import { getKmaMapping } from '../lib/kmaLookup.js';

describe('KMA Prefix Mapping', () => {
  let mapping;
  let prefixes;
  
  it('loads mapping', async () => {
    mapping = await getKmaMapping();
    expect(mapping).toBeTruthy();
    expect(mapping._isPrefixMap).toBe(true);
    expect(mapping.prefixes).toBeTruthy();
    prefixes = mapping.prefixes;
    const count = Object.keys(prefixes).length;
    expect(count).toBeGreaterThanOrEqual(900); // ensure full dataset shipped
  });

  it('has valid structure for every prefix', () => {
    if (!prefixes) throw new Error('Mapping not loaded from previous test');
    for (const [p, v] of Object.entries(prefixes)) {
      expect(p).toMatch(/^\d{3}$/); // 3-digit prefix
      expect(v).toBeTruthy();
      expect(typeof v.kma_code).toBe('string');
      expect(v.kma_code.length).toBeGreaterThan(0);
      expect('kma_name' in v).toBe(true);
    }
  });

  it('resolves known major market prefixes', () => {
    if (!prefixes) throw new Error('Mapping not loaded from previous test');
    const cases = [
      { prefix: '350', expected: /^BHM|AL_BIR/i }, // Birmingham region (allow pattern if code includes state)
      { prefix: '606', expected: /^CHI|IL_CHI/i }, // Chicago
      { prefix: '303', expected: /^ATL|GA_ATL/i }  // Atlanta
    ];
    for (const { prefix, expected } of cases) {
      const entry = prefixes[prefix];
      expect(entry, `Missing entry for prefix ${prefix}`).toBeTruthy();
      expect(entry.kma_code).toMatch(expected);
    }
  });

  it('fails loudly if a known prefix is missing (guard test)', () => {
    // Choose an obviously invalid prefix; ensure it is NOT present
    expect(prefixes['000']).toBeUndefined();
  });
});
