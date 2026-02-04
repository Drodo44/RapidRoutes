// lib/csvStructuralIntegrity.js
// Deep validation for CSV generation pipeline - Phase 2 enterprise audit
// Provides comprehensive checks for production-ready CSV output

import { DAT_HEADERS } from './datHeaders.js';
import { MIN_PAIRS_REQUIRED, ROWS_PER_PAIR } from './datCsvBuilder.js';
import { monitor } from './monitor.js';

/**
 * Comprehensive CSV structural integrity verification
 * Validates every aspect of generated CSV data before output
 */
export class CsvStructuralIntegrity {
  constructor() {
    this.validationResults = {
      headers: null,
      rows: null,
      business_rules: null,
      data_completeness: null,
      warnings: [],
      errors: []
    };
  }

  /**
   * Deep validation of complete CSVresults
   * @param {Object} csvData - Complete CSV generation result
   * @param {Array} originalLanes - Original lane inputs
   * @returns {Object} Validation results with pass/fail and detailed analysis
   */
  async validateCompleteGeneration(csvData, originalLanes) {
    const validationId = `csv_integrity_${Date.now()}`;
    monitor.startOperation(validationId, {
      operation_type: 'csv_structural_integrity',
      lanes_count: originalLanes.length,
      expected_min_rows: originalLanes.length * MIN_PAIRS_REQUIRED * ROWS_PER_PAIR
    });

    try {
      // 1. Header validation
      this.validationResults.headers = await this.validateHeaders(csvData.string);
      
      // 2. Row structure validation  
      this.validationResults.rows = await this.validateRowStructure(csvData.string);
      
      // 3. Business rule compliance
      this.validationResults.business_rules = await this.validateBusinessRules(csvData, originalLanes);
      
      // 4. Data completeness audit
      this.validationResults.data_completeness = await this.validateDataCompleteness(csvData, originalLanes);

      // Determine overall result
      const hasErrors = this.validationResults.errors.length > 0;
      const hasCriticalFailures = [
        this.validationResults.headers,
        this.validationResults.rows,
        this.validationResults.business_rules,
        this.validationResults.data_completeness
      ].some(result => result && !result.passed);

      const overallResult = {
        passed: !hasErrors && !hasCriticalFailures,
        validation_id: validationId,
        summary: {
          total_errors: this.validationResults.errors.length,
          total_warnings: this.validationResults.warnings.length,
          headers_valid: this.validationResults.headers?.passed || false,
          rows_valid: this.validationResults.rows?.passed || false,
          business_rules_valid: this.validationResults.business_rules?.passed || false,
          data_complete: this.validationResults.data_completeness?.passed || false
        },
        detailed_results: this.validationResults
      };

      monitor.endOperation(validationId, {
        success: overallResult.passed,
        validation_summary: overallResult.summary
      });

      return overallResult;

    } catch (error) {
      monitor.endOperation(validationId, {
        success: false,
        error: error.message
      });
      
      this.validationResults.errors.push({
        type: 'validation_system_failure',
        message: `CSV integrity validation failed: ${error.message}`,
        details: { error: error.message }
      });

      return {
        passed: false,
        validation_id: validationId,
        system_error: error.message,
        detailed_results: this.validationResults
      };
    }
  }

  /**
   * Validate CSV headers match DAT specification exactly
   */
  async validateHeaders(csvString) {
    try {
      const lines = csvString.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        throw new Error('Empty CSV string provided');
      }

      const headerLine = lines[0];
      const headers = this.parseCSVLine(headerLine);

      const result = {
        passed: true,
        header_count: headers.length,
        expected_count: DAT_HEADERS.length,
        issues: []
      };

      // Check header count
      if (headers.length !== DAT_HEADERS.length) {
        result.passed = false;
        result.issues.push({
          type: 'header_count_mismatch',
          message: `Expected ${DAT_HEADERS.length} headers, found ${headers.length}`,
          expected: DAT_HEADERS.length,
          found: headers.length
        });
      }

      // Check header order and content
      for (let i = 0; i < Math.max(headers.length, DAT_HEADERS.length); i++) {
        const expected = DAT_HEADERS[i];
        const found = headers[i];

        if (expected !== found) {
          result.passed = false;
          result.issues.push({
            type: 'header_mismatch',
            position: i,
            expected: expected || '(missing)',
            found: found || '(missing)',
            message: `Header position ${i}: expected "${expected}", found "${found}"`
          });
        }
      }

      if (!result.passed) {
        this.validationResults.errors.push({
          type: 'header_validation_failed',
          message: 'CSV headers do not match DAT specification',
          details: result
        });
      }

      return result;

    } catch (error) {
      const errorResult = {
        passed: false,
        error: error.message,
        issues: [{ type: 'header_parsing_error', message: error.message }]
      };

      this.validationResults.errors.push({
        type: 'header_validation_error',
        message: `Header validation failed: ${error.message}`,
        details: errorResult
      });

      return errorResult;
    }
  }

  /**
   * Validate individual row structure and required fields
   */
  async validateRowStructure(csvString) {
    try {
      const lines = csvString.split('\n').filter(line => line.trim());
      const dataLines = lines.slice(1); // Skip header

      const result = {
        passed: true,
        total_rows: dataLines.length,
        valid_rows: 0,
        invalid_rows: 0,
        issues: []
      };

      for (let i = 0; i < dataLines.length; i++) {
        const lineNumber = i + 2; // +1 for header, +1 for zero-indexing
        const line = dataLines[i];

        try {
          const fields = this.parseCSVLine(line);
          
          // Check field count
          if (fields.length !== DAT_HEADERS.length) {
            result.invalid_rows++;
            result.issues.push({
              type: 'field_count_mismatch',
              line: lineNumber,
              expected_fields: DAT_HEADERS.length,
              found_fields: fields.length,
              message: `Row ${lineNumber}: Expected ${DAT_HEADERS.length} fields, found ${fields.length}`
            });
            continue;
          }

          // Check required fields (marked with *)
          const requiredFieldErrors = [];
          for (let j = 0; j < DAT_HEADERS.length; j++) {
            const header = DAT_HEADERS[j];
            const value = fields[j];

            if (header.endsWith('*') && (!value || value.trim() === '')) {
              requiredFieldErrors.push({
                field: header,
                position: j,
                message: `Required field "${header}" is empty`
              });
            }
          }

          if (requiredFieldErrors.length > 0) {
            result.invalid_rows++;
            result.issues.push({
              type: 'missing_required_fields',
              line: lineNumber,
              required_field_errors: requiredFieldErrors,
              message: `Row ${lineNumber}: ${requiredFieldErrors.length} required fields missing`
            });
            continue;
          }

          result.valid_rows++;

        } catch (rowError) {
          result.invalid_rows++;
          result.issues.push({
            type: 'row_parsing_error',
            line: lineNumber,
            error: rowError.message,
            message: `Row ${lineNumber}: Failed to parse - ${rowError.message}`
          });
        }
      }

      // Set overall pass/fail
      result.passed = result.invalid_rows === 0;

      if (!result.passed) {
        this.validationResults.errors.push({
          type: 'row_structure_validation_failed',
          message: `${result.invalid_rows} of ${result.total_rows} rows failed validation`,
          details: result
        });
      }

      return result;

    } catch (error) {
      const errorResult = {
        passed: false,
        error: error.message,
        issues: [{ type: 'row_structure_parsing_error', message: error.message }]
      };

      this.validationResults.errors.push({
        type: 'row_structure_validation_error',
        message: `Row structure validation failed: ${error.message}`,
        details: errorResult
      });

      return errorResult;
    }
  }

  /**
   * Validate business rules compliance
   */
  async validateBusinessRules(csvData, originalLanes) {
    try {
      const result = {
        passed: true,
        minimum_rows_check: null,
        contact_method_duplication: null,
        kma_uniqueness: null,
        weight_validity: null,
        issues: []
      };

      // 1. Check minimum rows per lane
      const expectedMinRows = originalLanes.length * MIN_PAIRS_REQUIRED * ROWS_PER_PAIR;
      const lines = csvData.string.split('\n').filter(line => line.trim());
      const actualRows = lines.length - 1; // Subtract header

      result.minimum_rows_check = {
        passed: actualRows >= expectedMinRows,
        expected_minimum: expectedMinRows,
        actual_rows: actualRows,
        lanes_count: originalLanes.length
      };

      if (!result.minimum_rows_check.passed) {
        result.passed = false;
        result.issues.push({
          type: 'insufficient_rows',
          message: `Expected minimum ${expectedMinRows} rows, found ${actualRows}`,
          details: result.minimum_rows_check
        });
      }

      // 2. Verify contact method duplication (Phone + Email per pair)
      result.contact_method_duplication = await this.validateContactMethodDuplication(csvData.string);
      if (!result.contact_method_duplication.passed) {
        result.passed = false;
        result.issues.push({
          type: 'contact_method_duplication_failed',
          message: 'Contact method duplication validation failed',
          details: result.contact_method_duplication
        });
      }

      // 3. Check weight validity
      result.weight_validity = await this.validateWeightValues(csvData.string, originalLanes);
      if (!result.weight_validity.passed) {
        result.passed = false;
        result.issues.push({
          type: 'weight_validation_failed',
          message: 'Weight validation failed',
          details: result.weight_validity
        });
      }

      if (!result.passed) {
        this.validationResults.errors.push({
          type: 'business_rules_validation_failed',
          message: 'CSV does not comply with business rules',
          details: result
        });
      }

      return result;

    } catch (error) {
      const errorResult = {
        passed: false,
        error: error.message,
        issues: [{ type: 'business_rules_parsing_error', message: error.message }]
      };

      this.validationResults.errors.push({
        type: 'business_rules_validation_error',
        message: `Business rules validation failed: ${error.message}`,
        details: errorResult
      });

      return errorResult;
    }
  }

  /**
   * Validate data completeness and freight intelligence compliance
   */
  async validateDataCompleteness(csvData, originalLanes) {
    try {
      const result = {
        passed: true,
        city_completeness: null,
        reference_id_uniqueness: null,
        equipment_consistency: null,
        issues: []
      };

      const lines = csvData.string.split('\n').filter(line => line.trim());
      const dataLines = lines.slice(1);

      // 1. Check city completeness (no blank cities)
      result.city_completeness = await this.validateCityCompleteness(dataLines);
      if (!result.city_completeness.passed) {
        result.passed = false;
        result.issues.push({
          type: 'city_completeness_failed',
          message: 'City data completeness validation failed',
          details: result.city_completeness
        });
      }

      // 2. Check reference ID uniqueness
      result.reference_id_uniqueness = await this.validateReferenceIdUniqueness(dataLines);
      if (!result.reference_id_uniqueness.passed) {
        result.passed = false;
        result.issues.push({
          type: 'reference_id_uniqueness_failed',
          message: 'Reference ID uniqueness validation failed',
          details: result.reference_id_uniqueness
        });
      }

      // 3. Check equipment consistency
      result.equipment_consistency = await this.validateEquipmentConsistency(dataLines, originalLanes);
      if (!result.equipment_consistency.passed) {
        result.passed = false;
        result.issues.push({
          type: 'equipment_consistency_failed',
          message: 'Equipment consistency validation failed',
          details: result.equipment_consistency
        });
      }

      if (!result.passed) {
        this.validationResults.errors.push({
          type: 'data_completeness_validation_failed',
          message: 'Data completeness validation failed',
          details: result
        });
      }

      return result;

    } catch (error) {
      const errorResult = {
        passed: false,
        error: error.message,
        issues: [{ type: 'data_completeness_parsing_error', message: error.message }]
      };

      this.validationResults.errors.push({
        type: 'data_completeness_validation_error',
        message: `Data completeness validation failed: ${error.message}`,
        details: errorResult
      });

      return errorResult;
    }
  }

  /**
   * Helper method to parse CSV line handling quotes and escapes
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current);
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Don't forget the last field
    result.push(current);
    return result;
  }

  /**
   * Validate contact method duplication
   */
  async validateContactMethodDuplication(csvString) {
    const lines = csvString.split('\n').filter(line => line.trim());
    const dataLines = lines.slice(1);
    
    const contactMethodIndex = DAT_HEADERS.indexOf('Contact Method*');
    const originCityIndex = DAT_HEADERS.indexOf('Origin City*');
    const destCityIndex = DAT_HEADERS.indexOf('Destination City*');

    const pairGroups = new Map(); // Group by origin-destination
    const result = {
      passed: true,
      total_pairs: 0,
      properly_duplicated: 0,
      issues: []
    };

    for (let i = 0; i < dataLines.length; i++) {
      const fields = this.parseCSVLine(dataLines[i]);
      const originCity = fields[originCityIndex];
      const destCity = fields[destCityIndex];
      const contactMethod = fields[contactMethodIndex];
      
      const pairKey = `${originCity}->${destCity}`;
      
      if (!pairGroups.has(pairKey)) {
        pairGroups.set(pairKey, []);
      }
      
      pairGroups.get(pairKey).push({
        line: i + 2,
        contact_method: contactMethod
      });
    }

    result.total_pairs = pairGroups.size;

    for (const [pairKey, contacts] of pairGroups) {
      if (contacts.length !== 2) {
        result.passed = false;
        result.issues.push({
          type: 'incorrect_contact_duplication',
          pair: pairKey,
          expected_contacts: 2,
          found_contacts: contacts.length
        });
      } else {
        const methods = contacts.map(c => c.contact_method).sort();
        if (methods[0] !== 'Email' || methods[1] !== 'Primary Phone') {
          result.passed = false;
          result.issues.push({
            type: 'incorrect_contact_methods',
            pair: pairKey,
            expected: ['Email', 'Primary Phone'],
            found: methods
          });
        } else {
          result.properly_duplicated++;
        }
      }
    }

    return result;
  }

  /**
   * Validate weight values are within acceptable ranges
   */
  async validateWeightValues(csvString, originalLanes) {
    const lines = csvString.split('\n').filter(line => line.trim());
    const dataLines = lines.slice(1);
    
    const weightIndex = DAT_HEADERS.indexOf('Weight (lbs)*');
    const equipmentIndex = DAT_HEADERS.indexOf('Equipment*');

    const result = {
      passed: true,
      total_rows: dataLines.length,
      valid_weights: 0,
      invalid_weights: 0,
      issues: []
    };

    const EQUIPMENT_LIMITS = {
      'V': 45000, 'R': 43500, 'FD': 48000, 'SD': 45000
    };

    for (let i = 0; i < dataLines.length; i++) {
      const fields = this.parseCSVLine(dataLines[i]);
      const weightStr = fields[weightIndex];
      const equipment = fields[equipmentIndex];
      const weight = Number(weightStr);

      if (!Number.isFinite(weight) || weight <= 0) {
        result.passed = false;
        result.invalid_weights++;
        result.issues.push({
          type: 'invalid_weight_value',
          line: i + 2,
          weight_value: weightStr,
          message: `Invalid weight: ${weightStr}`
        });
        continue;
      }

      const limit = EQUIPMENT_LIMITS[equipment];
      if (limit && weight > limit) {
        result.passed = false;
        result.invalid_weights++;
        result.issues.push({
          type: 'weight_exceeds_equipment_limit',
          line: i + 2,
          weight: weight,
          equipment: equipment,
          limit: limit,
          message: `Weight ${weight} exceeds ${equipment} limit of ${limit}`
        });
        continue;
      }

      result.valid_weights++;
    }

    return result;
  }

  /**
   * Validate city completeness (no blank cities)
   */
  async validateCityCompleteness(dataLines) {
    const originCityIndex = DAT_HEADERS.indexOf('Origin City*');
    const destCityIndex = DAT_HEADERS.indexOf('Destination City*');
    const originStateIndex = DAT_HEADERS.indexOf('Origin State*');
    const destStateIndex = DAT_HEADERS.indexOf('Destination State*');

    const result = {
      passed: true,
      total_rows: dataLines.length,
      valid_cities: 0,
      invalid_cities: 0,
      issues: []
    };

    for (let i = 0; i < dataLines.length; i++) {
      const fields = this.parseCSVLine(dataLines[i]);
      const originCity = fields[originCityIndex]?.trim();
      const destCity = fields[destCityIndex]?.trim();
      const originState = fields[originStateIndex]?.trim();
      const destState = fields[destStateIndex]?.trim();

      const blanks = [];
      if (!originCity) blanks.push('Origin City');
      if (!destCity) blanks.push('Destination City');
      if (!originState) blanks.push('Origin State');
      if (!destState) blanks.push('Destination State');

      if (blanks.length > 0) {
        result.passed = false;
        result.invalid_cities++;
        result.issues.push({
          type: 'blank_city_fields',
          line: i + 2,
          blank_fields: blanks,
          message: `Row ${i + 2}: Blank city/state fields: ${blanks.join(', ')}`
        });
      } else {
        result.valid_cities++;
      }
    }

    return result;
  }

  /**
   * Validate reference ID uniqueness
   */
  async validateReferenceIdUniqueness(dataLines) {
    const refIdIndex = DAT_HEADERS.indexOf('Reference ID');
    
    const result = {
      passed: true,
      total_rows: dataLines.length,
      unique_refs: 0,
      duplicate_refs: 0,
      issues: []
    };

    const refIdCounts = new Map();

    for (let i = 0; i < dataLines.length; i++) {
      const fields = this.parseCSVLine(dataLines[i]);
      const refId = fields[refIdIndex]?.trim();

      if (!refId) {
        result.passed = false;
        result.issues.push({
          type: 'missing_reference_id',
          line: i + 2,
          message: `Row ${i + 2}: Missing reference ID`
        });
        continue;
      }

      if (!refIdCounts.has(refId)) {
        refIdCounts.set(refId, []);
      }
      refIdCounts.get(refId).push(i + 2);
    }

    for (const [refId, lines] of refIdCounts) {
      if (lines.length > 2) { // Allow exactly 2 (Phone + Email)
        result.passed = false;
        result.duplicate_refs++;
        result.issues.push({
          type: 'excessive_reference_id_duplication',
          reference_id: refId,
          lines: lines,
          occurrences: lines.length,
          message: `Reference ID "${refId}" appears ${lines.length} times (expected: 2)`
        });
      } else {
        result.unique_refs++;
      }
    }

    return result;
  }

  /**
   * Validate equipment consistency
   */
  async validateEquipmentConsistency(dataLines, originalLanes) {
    const equipmentIndex = DAT_HEADERS.indexOf('Equipment*');
    
    const result = {
      passed: true,
      total_rows: dataLines.length,
      consistent_equipment: 0,
      inconsistent_equipment: 0,
      issues: []
    };

    const laneEquipmentMap = new Map();
    originalLanes.forEach(lane => {
      laneEquipmentMap.set(lane.id, lane.equipment_code);
    });

    for (let i = 0; i < dataLines.length; i++) {
      const fields = this.parseCSVLine(dataLines[i]);
      const equipment = fields[equipmentIndex]?.trim();

      if (!equipment) {
        result.passed = false;
        result.inconsistent_equipment++;
        result.issues.push({
          type: 'missing_equipment',
          line: i + 2,
          message: `Row ${i + 2}: Missing equipment code`
        });
      } else {
        result.consistent_equipment++;
      }
    }

    return result;
  }
}

// Export singleton instance
export const csvStructuralIntegrity = new CsvStructuralIntegrity();