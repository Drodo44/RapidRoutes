import { describe, test, expect } from 'vitest';
import { validateEquipmentWeight } from '../lib/datCsvBuilder.js';
import { EQUIPMENT_WEIGHTS } from '../lib/equipmentWeights.js';

describe('Equipment Weight Validation', () => {
    // Test exact boundary conditions for each equipment type
    Object.entries(EQUIPMENT_WEIGHTS).forEach(([code, limits]) => {
        describe(`${code} Equipment Type`, () => {
            test(`accepts weight at minimum (${limits.min})`, () => {
                expect(() => validateEquipmentWeight({
                    equipment_code: code,
                    weight_lbs: limits.min,
                    randomize_weight: false
                })).not.toThrow();
            });

            test(`accepts weight at maximum (${limits.max})`, () => {
                expect(() => validateEquipmentWeight({
                    equipment_code: code,
                    weight_lbs: limits.max,
                    randomize_weight: false
                })).not.toThrow();
            });

            test(`rejects weight below minimum (${limits.min - 1})`, () => {
                expect(() => validateEquipmentWeight({
                    equipment_code: code,
                    weight_lbs: limits.min - 1,
                    randomize_weight: false
                })).toThrow(/below minimum/);
            });

            test(`rejects weight above maximum (${limits.max + 1})`, () => {
                expect(() => validateEquipmentWeight({
                    equipment_code: code,
                    weight_lbs: limits.max + 1,
                    randomize_weight: false
                })).toThrow(/exceeds maximum/);
            });

            // Randomization tests
            test('handles randomization within valid range', () => {
                expect(() => validateEquipmentWeight({
                    equipment_code: code,
                    randomize_weight: true,
                    weight_min: limits.min,
                    weight_max: limits.max
                })).not.toThrow();
            });

            test('rejects invalid randomization range', () => {
                expect(() => validateEquipmentWeight({
                    equipment_code: code,
                    randomize_weight: true,
                    weight_min: limits.min - 1000,
                    weight_max: limits.max + 1000
                })).toThrow(/Invalid weight range/);
            });
        });
    });
});
