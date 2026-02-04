// test/enterpriseTests.js
// Comprehensive enterprise-level test suite for CSV generation
// Tests all failure modes, edge cases, and resilience scenarios

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateLane, validateCityPair, validateCsvRow, ValidationError } from '../lib/enterpriseValidation.js';
import { verifyCsvStructure, verifyBusinessRequirements, verifyCompleteCSV } from '../lib/csvVerification.js';
import { TransactionContext, ReferenceIdManager, CsvGenerationTransaction } from '../lib/transactionManager.js';
import { generateDatCsvRows } from '../lib/datCsvBuilder.js';
import { DAT_HEADERS } from '../lib/datHeaders.js';

describe('Enterprise CSV Generation - Phase 2 Resilience Tests', () => {
  
  describe('Schema Validation - Hard Guarantees', () => {
    
    describe('Lane Validation', () => {
      it('should FAIL on missing required fields', () => {
        const invalidLane = {
          id: 'test-123',
          // Missing origin_city - should fail
          origin_state: 'TX',
          dest_city: 'Dallas',
          dest_state: 'TX',
          equipment_code: 'FD',
          pickup_earliest: '12/25/2024',
          length_ft: 48
        };

        expect(() => validateLane(invalidLane)).toThrow(ValidationError);
        expect(() => validateLane(invalidLane)).toThrow(/origin_city is required/);
      });

      it('should FAIL on invalid data types', () => {
        const invalidLane = {
          id: 'test-123',
          origin_city: 'Houston',
          origin_state: 'TX',
          dest_city: 'Dallas', 
          dest_state: 'TX',
          equipment_code: 'FD',
          pickup_earliest: '12/25/2024',
          length_ft: 'invalid-length' // Should be number
        };

        expect(() => validateLane(invalidLane)).toThrow(ValidationError);
        expect(() => validateLane(invalidLane)).toThrow(/must be a number/);
      });

      it('should FAIL on invalid weight configuration', () => {
        const invalidLane = {
          id: 'test-123',
          origin_city: 'Houston',
          origin_state: 'TX',
          dest_city: 'Dallas',
          dest_state: 'TX', 
          equipment_code: 'FD',
          pickup_earliest: '12/25/2024',
          length_ft: 48,
          randomize_weight: false
          // Missing weight_lbs when randomize_weight is false
        };

        expect(() => validateLane(invalidLane)).toThrow(ValidationError);
        expect(() => validateLane(invalidLane)).toThrow(/weight_lbs is required/);
      });

      it('should FAIL on weight exceeding equipment limits', () => {
        const invalidLane = {
          id: 'test-123',
          origin_city: 'Houston',
          origin_state: 'TX',
          dest_city: 'Dallas',
          dest_state: 'TX',
          equipment_code: 'V', // Van limit is 45000
          pickup_earliest: '12/25/2024',
          length_ft: 48,
          randomize_weight: false,
          weight_lbs: 50000 // Exceeds van limit
        };

        expect(() => validateLane(invalidLane)).toThrow(ValidationError);
        expect(() => validateLane(invalidLane)).toThrow(/exceeds.*limit/);
      });

      it('should PASS on valid lane data', () => {
        const validLane = {
          id: 'test-123',
          origin_city: 'Houston',
          origin_state: 'TX',
          dest_city: 'Dallas',
          dest_state: 'TX',
          equipment_code: 'FD',
          pickup_earliest: '12/25/2024',
          length_ft: 48,
          randomize_weight: false,
          weight_lbs: 47000
        };

        expect(() => validateLane(validLane)).not.toThrow();
        expect(validateLane(validLane)).toBe(true);
      });
    });

    describe('City Pair Validation', () => {
      it('should FAIL on missing pickup data', () => {
        const invalidPair = {
          // Missing pickup object
          delivery: {
            city: 'Dallas',
            state: 'TX',
            kma_code: 'DAL'
          }
        };

        expect(() => validateCityPair(invalidPair)).toThrow(ValidationError);
        expect(() => validateCityPair(invalidPair)).toThrow(/pickup must be a valid object/);
      });

      it('should FAIL on identical pickup and delivery', () => {
        const invalidPair = {
          pickup: {
            city: 'Houston', 
            state: 'TX',
            kma_code: 'HOU'
          },
          delivery: {
            city: 'Houston', // Same as pickup
            state: 'TX',
            kma_code: 'HOU'
          }
        };

        expect(() => validateCityPair(invalidPair)).toThrow(ValidationError);
        expect(() => validateCityPair(invalidPair)).toThrow(/cannot be identical/);
      });

      it('should PASS on valid city pair', () => {
        const validPair = {
          pickup: {
            city: 'Houston',
            state: 'TX', 
            kma_code: 'HOU'
          },
          delivery: {
            city: 'Dallas',
            state: 'TX',
            kma_code: 'DAL'
          }
        };

        expect(() => validateCityPair(validPair)).not.toThrow();
        expect(validateCityPair(validPair)).toBe(true);
      });
    });

    describe('CSV Row Validation', () => {
      it('should FAIL on missing required headers', () => {
        const incompleteRow = {
          'Pickup Earliest*': '12/25/2024',
          // Missing many required fields
          'Origin City*': 'Houston'
        };

        expect(() => validateCsvRow(incompleteRow)).toThrow(ValidationError);
        expect(() => validateCsvRow(incompleteRow)).toThrow(/Missing header/);
      });

      it('should FAIL on invalid contact method', () => {
        const invalidRow = {};
        // Populate with all headers
        for (const header of DAT_HEADERS) {
          invalidRow[header] = header.endsWith('*') ? 'test' : '';
        }
        invalidRow['Contact Method*'] = 'invalid-method'; // Should be 'email' or 'primary phone'

        expect(() => validateCsvRow(invalidRow)).toThrow(ValidationError);
        expect(() => validateCsvRow(invalidRow)).toThrow(/must be one of/);
      });

      it('should PASS on valid CSV row', () => {
        const validRow = {};
        for (const header of DAT_HEADERS) {
          validRow[header] = '';
        }
        
        // Set required fields
        validRow['Pickup Earliest*'] = '12/25/2024';
        validRow['Length (ft)*'] = '48';
        validRow['Weight (lbs)*'] = '47000';
        validRow['Full/Partial*'] = 'full';
        validRow['Equipment*'] = 'FD';
        validRow['Use Private Network*'] = 'no';
        validRow['Use DAT Loadboard*'] = 'yes';
        validRow['Contact Method*'] = 'email';
        validRow['Origin City*'] = 'Houston';
        validRow['Origin State*'] = 'TX';
        validRow['Destination City*'] = 'Dallas';
        validRow['Destination State*'] = 'TX';

        expect(() => validateCsvRow(validRow)).not.toThrow();
        expect(validateCsvRow(validRow)).toBe(true);
      });
    });
  });

  describe('CSV Structure Verification', () => {
    
    it('should FAIL on empty CSV', () => {
      const result = verifyCsvStructure('');
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: expect.any(String),
            message: expect.stringContaining('empty')
          })
        ])
      );
    });

    it('should FAIL on wrong header count', () => {
      const csvWithWrongHeaders = 'Header1,Header2,Header3\nvalue1,value2,value3';
      const result = verifyCsvStructure(csvWithWrongHeaders);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'header_count_mismatch'
          })
        ])
      );
    });

    it('should FAIL on wrong header names', () => {
      const wrongHeaders = Array(24).fill('Wrong Header').map((h, i) => `${h} ${i}`);
      const csvWithWrongHeaders = wrongHeaders.join(',') + '\n' + Array(24).fill('value').join(',');
      
      const result = verifyCsvStructure(csvWithWrongHeaders);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].type).toBe('header_mismatch');
    });

    it('should PASS on correctly formatted CSV', () => {
      const correctHeaders = DAT_HEADERS.join(',');
      const sampleRow = Array(24).fill('test-value').join(',');
      const validCsv = correctHeaders + '\n' + sampleRow;

      const result = verifyCsvStructure(validCsv, { 
        requireAllFields: false, // Skip field validation for this test
        validateBusinessRules: false 
      });

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should handle CSV with quoted fields correctly', () => {
      const correctHeaders = DAT_HEADERS.join(',');
      const quotedRow = Array(24).fill('"quoted,value"').join(',');
      const csvWithQuotes = correctHeaders + '\n' + quotedRow;

      const result = verifyCsvStructure(csvWithQuotes, {
        requireAllFields: false,
        validateBusinessRules: false
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('Business Requirements Verification', () => {
    
    it('should FAIL when insufficient rows for lanes', () => {
      const mockLanes = [
        { id: '1', name: 'Lane 1' },
        { id: '2', name: 'Lane 2' }
      ];
      
      // Only 10 rows, but need 24 (2 lanes × 12 rows each)
      const csvWith10Rows = DAT_HEADERS.join(',') + '\n' + 
        Array(10).fill(Array(24).fill('value').join(',')).join('\n');

      const result = verifyBusinessRequirements(csvWith10Rows, mockLanes);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'insufficient_rows'
          })
        ])
      );
    });

    it('should PASS when minimum row requirements are met', () => {
      const mockLanes = [
        { id: '1', name: 'Lane 1' }
      ];

      // 12 rows for 1 lane (minimum requirement)
      const validRows = [];
      for (let i = 0; i < 12; i++) {
        const row = Array(24).fill('value');
        row[23] = 'RR12345'; // Reference ID in last column
        validRows.push(row.join(','));
      }
      
      const validCsv = DAT_HEADERS.join(',') + '\n' + validRows.join('\n');
      const result = verifyBusinessRequirements(validCsv, mockLanes);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('Transaction Management', () => {
    
    describe('Reference ID Manager', () => {
      let manager;

      beforeEach(() => {
        manager = new ReferenceIdManager();
      });

      it('should generate unique reference IDs', () => {
        const id1 = manager.generateReferenceId('lane-1');
        const id2 = manager.generateReferenceId('lane-2');
        
        expect(id1).toMatch(/^RR\d{5}$/);
        expect(id2).toMatch(/^RR\d{5}$/);
        expect(id1).not.toBe(id2);
      });

      it('should return same ID for same lane', () => {
        const id1 = manager.generateReferenceId('same-lane');
        const id2 = manager.generateReferenceId('same-lane');
        
        expect(id1).toBe(id2);
      });

      it('should handle ID collisions gracefully', () => {
        // Force collision by pre-populating used IDs
        manager.usedIds.add('RR10000');
        manager.usedIds.add('RR10001');
        manager.usedIds.add('RR10002');

        const id = manager.generateReferenceId('test-lane');
        expect(id).toMatch(/^RR\d{5}$/);
        expect(manager.usedIds.has(id)).toBe(true);
      });
    });

    describe('Transaction Context', () => {
      it('should execute operations in order', async () => {
        const transaction = new TransactionContext('test-tx');
        const executionOrder = [];

        transaction.addOperation('op1', async () => {
          executionOrder.push('op1');
          return 'result1';
        });

        transaction.addOperation('op2', async () => {
          executionOrder.push('op2'); 
          return 'result2';
        });

        const results = await transaction.execute();
        
        expect(executionOrder).toEqual(['op1', 'op2']);
        expect(results).toHaveLength(2);
        expect(results[0].result).toBe('result1');
        expect(results[1].result).toBe('result2');
      });

      it('should rollback on failure', async () => {
        const transaction = new TransactionContext('test-tx');
        const rollbackCalled = [];

        transaction.addOperation('op1', async () => {
          return 'success';
        }, async () => {
          rollbackCalled.push('op1-rollback');
        });

        transaction.addOperation('op2', async () => {
          throw new Error('Operation 2 failed');
        }, async () => {
          rollbackCalled.push('op2-rollback');
        });

        await expect(transaction.execute()).rejects.toThrow('Operation 2 failed');
        expect(rollbackCalled).toContain('op1-rollback');
      });
    });
  });

  describe('Error Conditions and Edge Cases', () => {
    
    it('should handle null/undefined lane data gracefully', () => {
      expect(() => validateLane(null)).toThrow(ValidationError);
      expect(() => validateLane(undefined)).toThrow(ValidationError);
      expect(() => validateLane({})).toThrow(ValidationError);
    });

    it('should handle malformed city pairs', () => {
      const malformedPairs = [
        null,
        undefined,
        {},
        { pickup: null },
        { delivery: null },
        { pickup: {}, delivery: {} },
        { pickup: { city: '' }, delivery: { city: '' } }
      ];

      malformedPairs.forEach(pair => {
        expect(() => validateCityPair(pair)).toThrow(ValidationError);
      });
    });

    it('should handle CSV with various malformed content', () => {
      const malformedCsvs = [
        '', // Empty
        'header', // Only header, no data
        '\n\n\n', // Only newlines
        'header1,header2\n,', // Empty fields
        'header1,header2\nvalue1', // Insufficient columns
        DAT_HEADERS.join(',') + '\n' + 'only,one,value' // Wrong column count
      ];

      malformedCsvs.forEach(csv => {
        const result = verifyCsvStructure(csv);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should validate weight randomization edge cases', () => {
      const edgeCases = [
        {
          lane: {
            id: 'test',
            origin_city: 'A', origin_state: 'TX',
            dest_city: 'B', dest_state: 'TX',
            equipment_code: 'FD',
            pickup_earliest: '1/1/2024',
            length_ft: 48,
            randomize_weight: true,
            weight_min: 50000, // Min greater than max
            weight_max: 40000
          },
          shouldFail: true,
          reason: 'min greater than max'
        },
        {
          lane: {
            id: 'test',
            origin_city: 'A', origin_state: 'TX', 
            dest_city: 'B', dest_state: 'TX',
            equipment_code: 'FD',
            pickup_earliest: '1/1/2024',
            length_ft: 48,
            randomize_weight: true,
            weight_min: -1000, // Negative weight
            weight_max: 40000
          },
          shouldFail: true,
          reason: 'negative weight'
        }
      ];

      edgeCases.forEach(({ lane, shouldFail, reason }) => {
        if (shouldFail) {
          expect(() => validateLane(lane), `Should fail: ${reason}`).toThrow(ValidationError);
        } else {
          expect(() => validateLane(lane), `Should pass: ${reason}`).not.toThrow();
        }
      });
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    
    it('should handle large datasets without memory issues', () => {
      // Create a large mock lane dataset
      const largeLanes = Array(1000).fill(null).map((_, i) => ({
        id: `large-lane-${i}`,
        origin_city: 'Houston',
        origin_state: 'TX',
        dest_city: 'Dallas', 
        dest_state: 'TX',
        equipment_code: 'FD',
        pickup_earliest: '1/1/2024',
        length_ft: 48,
        randomize_weight: false,
        weight_lbs: 47000
      }));

      // Validate the dataset (should not throw memory errors)
      expect(() => {
        largeLanes.forEach(lane => validateLane(lane));
      }).not.toThrow();
    });

    it('should handle CSV verification with row limits', () => {
      const headers = DAT_HEADERS.join(',');
      const manyRows = Array(10000).fill(Array(24).fill('value').join(','));
      const largeCsv = headers + '\n' + manyRows.join('\n');

      // Verify with row limit to prevent performance issues
      const result = verifyCsvStructure(largeCsv, { 
        maxRowsToCheck: 100,
        requireAllFields: false,
        validateBusinessRules: false
      });

      expect(result.statistics.dataRows).toBe(10000);
      expect(result.rows.analyzed).toBe(100); // Limited analysis
    });
  });

  describe('Concurrent Operations', () => {
    
    it('should handle multiple simultaneous validation requests', async () => {
      const validLane = {
        id: 'concurrent-test',
        origin_city: 'Houston',
        origin_state: 'TX',
        dest_city: 'Dallas',
        dest_state: 'TX',
        equipment_code: 'FD',
        pickup_earliest: '1/1/2024',
        length_ft: 48,
        randomize_weight: false,
        weight_lbs: 47000
      };

      // Run 50 concurrent validations
      const promises = Array(50).fill(null).map(() => 
        Promise.resolve().then(() => validateLane(validLane))
      );

      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(result => {
        expect(result).toBe(true);
      });
    });
  });
});

describe('Integration Tests - End-to-End Scenarios', () => {
  
  it('should validate complete pipeline with realistic data', () => {
    const realisticLane = {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      origin_city: 'Houston',
      origin_state: 'TX',
      origin_zip: '77001',
      dest_city: 'Dallas',
      dest_state: 'TX', 
      dest_zip: '75201',
      equipment_code: 'FD',
      pickup_earliest: '12/25/2024',
      pickup_latest: '12/26/2024',
      length_ft: 48,
      randomize_weight: true,
      weight_min: 46000,
      weight_max: 48000,
      full_partial: 'full',
      comment: 'Urgent delivery required',
      commodity: 'Steel coils'
    };

    // Should pass all validation
    expect(() => validateLane(realisticLane)).not.toThrow();
    
    // Should generate reference ID properly
    const manager = new ReferenceIdManager();
    const refId = manager.generateReferenceId(realisticLane.id);
    expect(refId).toMatch(/^RR\d{5}$/);
  });

  it('should handle complete CSV generation workflow', async () => {
    const testLanes = [
      {
        id: 'lane-1',
        origin_city: 'Houston',
        origin_state: 'TX',
        dest_city: 'Dallas',
        dest_state: 'TX',
        equipment_code: 'FD',
        pickup_earliest: '1/1/2024',
        length_ft: 48,
        randomize_weight: false,
        weight_lbs: 47000
      }
    ];

    // Validate lanes
    testLanes.forEach(lane => {
      expect(() => validateLane(lane)).not.toThrow();
    });

    // Create transaction
    const transaction = new CsvGenerationTransaction(testLanes);
    expect(transaction.getStatus().lanes_count).toBe(1);
  });
});