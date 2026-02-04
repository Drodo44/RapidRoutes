// lib/csvVerification.js
// Post-generation CSV verification system
// Validates structure, completeness, and business rules

import { DAT_HEADERS } from './datHeaders.js';
import { monitor } from './monitor.js';
import { validateCsvRow } from './enterpriseValidation.js';

/**
 * CSV verification error with detailed context
 */
export class CsvVerificationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'CsvVerificationError';
    this.details = details;
    this.isCsvVerificationError = true;
  }
}

/**
 * Comprehensive CSV structure verification
 * Validates headers, row completeness, data integrity
 */
export function verifyCsvStructure(csvString, options = {}) {
  const traceId = `csv_verify_${Date.now()}`;
  const {
    strictHeaderValidation = true,
    requireAllFields = true,
    validateBusinessRules = true,
    maxRowsToCheck = Infinity
  } = options;

  monitor.log('info', `🔍 Starting CSV verification`, { traceId });

  const verification = {
    traceId,
    valid: false,
    errors: [],
    warnings: [],
    statistics: {
      totalLines: 0,
      headerLine: null,
      dataRows: 0,
      emptyRows: 0,
      invalidRows: 0,
      validRows: 0
    },
    headers: {
      found: [],
      expected: DAT_HEADERS,
      missing: [],
      extra: [],
      orderCorrect: false
    },
    rows: {
      analyzed: 0,
      fieldCompleteness: {},
      businessRuleViolations: []
    }
  };

  try {
    // Parse CSV string into lines
    if (!csvString || typeof csvString !== 'string') {
      throw new CsvVerificationError('CSV must be a non-empty string', { traceId });
    }

    const lines = csvString.split('\n').filter(line => line.trim().length > 0);
    verification.statistics.totalLines = lines.length;

    if (lines.length === 0) {
      throw new CsvVerificationError('CSV is empty', { traceId });
    }

    // Verify header line
    const headerLine = lines[0];
    verification.statistics.headerLine = headerLine;
    
    // Parse headers (handle quoted headers properly)
    const foundHeaders = parseCSVLine(headerLine);
    verification.headers.found = foundHeaders;

    // Header validation
    if (strictHeaderValidation) {
      // Check exact match with DAT_HEADERS
      if (foundHeaders.length !== DAT_HEADERS.length) {
        verification.errors.push({
          type: 'header_count_mismatch',
          message: `Expected ${DAT_HEADERS.length} headers, found ${foundHeaders.length}`,
          expected: DAT_HEADERS.length,
          found: foundHeaders.length
        });
      }

      // Check header order and names
      for (let i = 0; i < Math.max(foundHeaders.length, DAT_HEADERS.length); i++) {
        const expected = DAT_HEADERS[i];
        const found = foundHeaders[i];

        if (!expected) {
          verification.headers.extra.push({ position: i, header: found });
        } else if (!found) {
          verification.headers.missing.push({ position: i, header: expected });
        } else if (found !== expected) {
          verification.errors.push({
            type: 'header_mismatch',
            message: `Header at position ${i}: expected "${expected}", found "${found}"`,
            position: i,
            expected,
            found
          });
        }
      }

      verification.headers.orderCorrect = verification.errors.filter(e => e.type === 'header_mismatch').length === 0;
    }

    // Initialize field completeness tracking
    for (const header of DAT_HEADERS) {
      verification.rows.fieldCompleteness[header] = {
        total: 0,
        filled: 0,
        empty: 0,
        percentage: 0
      };
    }

    // Verify data rows
    const dataLines = lines.slice(1);
    verification.statistics.dataRows = dataLines.length;
    const rowsToCheck = Math.min(dataLines.length, maxRowsToCheck);

    for (let i = 0; i < rowsToCheck; i++) {
      const lineNumber = i + 2; // +2 because we start from line 2 (after header)
      const line = dataLines[i];
      
      verification.rows.analyzed++;

      if (line.trim() === '') {
        verification.statistics.emptyRows++;
        verification.warnings.push({
          type: 'empty_row',
          message: `Empty row at line ${lineNumber}`,
          lineNumber
        });
        continue;
      }

      try {
        const rowData = parseCSVLine(line);
        
        // Convert array to object using headers
        const rowObject = {};
        for (let j = 0; j < foundHeaders.length; j++) {
          rowObject[foundHeaders[j]] = rowData[j] || '';
        }

        // Field completeness analysis
        for (const header of DAT_HEADERS) {
          const stats = verification.rows.fieldCompleteness[header];
          stats.total++;
          
          const value = rowObject[header];
          if (value && value.trim() !== '') {
            stats.filled++;
          } else {
            stats.empty++;
          }
        }

        // Validate row structure if required
        if (requireAllFields) {
          try {
            validateCsvRow(rowObject, i);
          } catch (validationError) {
            verification.statistics.invalidRows++;
            verification.errors.push({
              type: 'row_validation_failed',
              message: `Row ${lineNumber} validation failed: ${validationError.message}`,
              lineNumber,
              row: i,
              details: validationError.details
            });
            continue;
          }
        }

        // Business rule validation
        if (validateBusinessRules) {
          const businessRuleErrors = validateRowBusinessRules(rowObject, lineNumber);
          if (businessRuleErrors.length > 0) {
            verification.rows.businessRuleViolations.push(...businessRuleErrors);
          }
        }

        verification.statistics.validRows++;

      } catch (parseError) {
        verification.statistics.invalidRows++;
        verification.errors.push({
          type: 'row_parse_error',
          message: `Failed to parse row ${lineNumber}: ${parseError.message}`,
          lineNumber,
          row: i
        });
      }
    }

    // Calculate field completeness percentages
    for (const header of DAT_HEADERS) {
      const stats = verification.rows.fieldCompleteness[header];
      if (stats.total > 0) {
        stats.percentage = Math.round((stats.filled / stats.total) * 100);
      }
    }

    // Final validation
    verification.valid = verification.errors.length === 0;

    // Generate summary
    const summary = {
      valid: verification.valid,
      errorCount: verification.errors.length,
      warningCount: verification.warnings.length,
      rowsAnalyzed: verification.rows.analyzed,
      validRows: verification.statistics.validRows,
      invalidRows: verification.statistics.invalidRows,
      completeness: Math.round((verification.statistics.validRows / verification.rows.analyzed) * 100)
    };

    monitor.log(verification.valid ? 'info' : 'error', 
      `📊 CSV verification ${verification.valid ? 'PASSED' : 'FAILED'}:`, 
      { traceId, ...summary }
    );

    return {
      ...verification,
      summary
    };

  } catch (error) {
    verification.valid = false;
    verification.errors.push({
      type: 'verification_failure',
      message: error.message,
      details: error.details || {}
    });

    monitor.log('error', `❌ CSV verification failed:`, { traceId, error: error.message });
    
    return verification;
  }
}

/**
 * Parse a single CSV line handling quotes and escapes properly
 */
function parseCSVLine(line) {
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
        // Toggle quote mode
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

  // Add the last field
  result.push(current);
  
  return result;
}

/**
 * Validate business rules for a single CSV row
 */
function validateRowBusinessRules(row, lineNumber) {
  const errors = [];

  // Required field validation
  const requiredFields = [
    'Pickup Earliest*',
    'Length (ft)*',
    'Weight (lbs)*',
    'Full/Partial*',
    'Equipment*',
    'Use Private Network*',
    'Use DAT Loadboard*',
    'Contact Method*',
    'Origin City*',
    'Origin State*',
    'Destination City*',
    'Destination State*'
  ];

  for (const field of requiredFields) {
    if (!row[field] || row[field].trim() === '') {
      errors.push({
        type: 'missing_required_field',
        message: `Required field "${field}" is empty at line ${lineNumber}`,
        field,
        lineNumber
      });
    }
  }

  // Weight validation
  const weight = row['Weight (lbs)*'];
  if (weight) {
    const weightNum = parseInt(weight, 10);
    if (isNaN(weightNum) || weightNum <= 0 || weightNum > 100000) {
      errors.push({
        type: 'invalid_weight',
        message: `Invalid weight "${weight}" at line ${lineNumber}`,
        field: 'Weight (lbs)*',
        value: weight,
        lineNumber
      });
    }
  }

  // Length validation
  const length = row['Length (ft)*'];
  if (length) {
    const lengthNum = parseInt(length, 10);
    if (isNaN(lengthNum) || lengthNum <= 0 || lengthNum > 199) {
      errors.push({
        type: 'invalid_length',
        message: `Invalid length "${length}" at line ${lineNumber}`,
        field: 'Length (ft)*',
        value: length,
        lineNumber
      });
    }
  }

  // Equipment validation
  const equipment = row['Equipment*'];
  if (equipment) {
    const validEquipment = ['V', 'R', 'FD', 'SD', 'RGN', 'LB', 'F'];
    if (!validEquipment.includes(equipment.toUpperCase())) {
      errors.push({
        type: 'invalid_equipment',
        message: `Invalid equipment code "${equipment}" at line ${lineNumber}`,
        field: 'Equipment*',
        value: equipment,
        lineNumber
      });
    }
  }

  // Contact method validation
  const contactMethod = row['Contact Method*'];
  if (contactMethod) {
    const validMethods = ['email', 'primary phone'];
    if (!validMethods.includes(contactMethod.toLowerCase())) {
      errors.push({
        type: 'invalid_contact_method',
        message: `Invalid contact method "${contactMethod}" at line ${lineNumber}`,
        field: 'Contact Method*',
        value: contactMethod,
        lineNumber
      });
    }
  }

  // State validation (2-letter codes)
  const originState = row['Origin State*'];
  const destState = row['Destination State*'];
  
  if (originState && (originState.length !== 2 || !/^[A-Z]{2}$/.test(originState))) {
    errors.push({
      type: 'invalid_state_code',
      message: `Invalid origin state code "${originState}" at line ${lineNumber}`,
      field: 'Origin State*',
      value: originState,
      lineNumber
    });
  }

  if (destState && (destState.length !== 2 || !/^[A-Z]{2}$/.test(destState))) {
    errors.push({
      type: 'invalid_state_code',
      message: `Invalid destination state code "${destState}" at line ${lineNumber}`,
      field: 'Destination State*',
      value: destState,
      lineNumber
    });
  }

  // Full/Partial validation
  const fullPartial = row['Full/Partial*'];
  if (fullPartial) {
    const validValues = ['full', 'partial'];
    if (!validValues.includes(fullPartial.toLowerCase())) {
      errors.push({
        type: 'invalid_full_partial',
        message: `Invalid Full/Partial value "${fullPartial}" at line ${lineNumber}`,
        field: 'Full/Partial*',
        value: fullPartial,
        lineNumber
      });
    }
  }

  return errors;
}

/**
 * Verify CSV meets minimum business requirements
 */
export function verifyBusinessRequirements(csvString, lanes) {
  const traceId = `business_verify_${Date.now()}`;
  
  const requirements = {
    traceId,
    valid: false,
    errors: [],
    requirements: {
      minimumRowsPerLane: 10, // 5 pairs × 2 contact methods
      expectedLanes: lanes.length,
      expectedTotalRows: lanes.length * 10,
      uniqueReferenceIds: true,
      allRequiredFields: true
    },
    actual: {
      totalRows: 0,
      uniqueReferenceIds: 0,
      lanesRepresented: 0
    }
  };

  try {
    const lines = csvString.split('\n').filter(line => line.trim().length > 0);
    const dataLines = lines.slice(1); // Skip header
    requirements.actual.totalRows = dataLines.length;

    // Parse all rows and collect reference IDs
    const referenceIds = new Set();
    const laneReferences = new Set();

    for (const line of dataLines) {
      try {
        const rowData = parseCSVLine(line);
        const headers = parseCSVLine(lines[0]);
        
        const row = {};
        for (let i = 0; i < headers.length; i++) {
          row[headers[i]] = rowData[i] || '';
        }

        // Track reference IDs
        const refId = row['Reference ID'];
        if (refId && refId.trim()) {
          referenceIds.add(refId.trim());
          
          // Extract lane identifier from reference ID (assuming RR##### format)
          if (/^RR\d{5}$/.test(refId.trim())) {
            laneReferences.add(refId.trim());
          }
        }

      } catch (parseError) {
        // Skip invalid rows for business requirement check
        continue;
      }
    }

    requirements.actual.uniqueReferenceIds = referenceIds.size;
    requirements.actual.lanesRepresented = laneReferences.size;

    // Validate minimum rows requirement (must be >= minimum, not exact match)
    const minimumRequiredRows = requirements.requirements.minimumRowsPerLane * requirements.requirements.expectedLanes;
    if (requirements.actual.totalRows < minimumRequiredRows) {
      requirements.errors.push({
        type: 'insufficient_rows',
        message: `Expected minimum ${minimumRequiredRows} rows, found ${requirements.actual.totalRows}`,
        expected: minimumRequiredRows,
        actual: requirements.actual.totalRows
      });
    }

    // Validate lane representation
    if (requirements.actual.lanesRepresented < requirements.requirements.expectedLanes) {
      requirements.errors.push({
        type: 'insufficient_lane_representation',
        message: `Expected ${requirements.requirements.expectedLanes} lanes represented, found ${requirements.actual.lanesRepresented}`,
        expected: requirements.requirements.expectedLanes,
        actual: requirements.actual.lanesRepresented
      });
    }

    requirements.valid = requirements.errors.length === 0;

    monitor.log(requirements.valid ? 'info' : 'error',
      `📋 Business requirements ${requirements.valid ? 'MET' : 'NOT MET'}:`,
      { 
        traceId,
        totalRows: requirements.actual.totalRows,
        minimumRequiredRows: requirements.requirements.minimumRowsPerLane * requirements.requirements.expectedLanes,
        lanesRepresented: requirements.actual.lanesRepresented,
        expectedLanes: requirements.requirements.expectedLanes
      }
    );

    return requirements;

  } catch (error) {
    requirements.valid = false;
    requirements.errors.push({
      type: 'business_verification_failure',
      message: error.message
    });

    monitor.log('error', `❌ Business requirements verification failed:`, { traceId, error: error.message });
    return requirements;
  }
}

/**
 * Complete CSV verification combining structure and business rules
 */
export function verifyCompleteCSV(csvString, lanes, options = {}) {
  const traceId = `complete_verify_${Date.now()}`;
  
  monitor.log('info', `🔍 Starting complete CSV verification for ${lanes.length} lanes`, { traceId });

  // Run structure verification
  const structureResult = verifyCsvStructure(csvString, options);
  
  // Run business requirements verification
  const businessResult = verifyBusinessRequirements(csvString, lanes);

  // Combine results
  const completeResult = {
    traceId,
    valid: structureResult.valid && businessResult.valid,
    structure: structureResult,
    business: businessResult,
    summary: {
      structureValid: structureResult.valid,
      businessValid: businessResult.valid,
      totalErrors: structureResult.errors.length + businessResult.errors.length,
      totalWarnings: structureResult.warnings.length,
      completeness: structureResult.summary?.completeness || 0
    }
  };

  monitor.log(completeResult.valid ? 'info' : 'error',
    `📊 Complete CSV verification ${completeResult.valid ? 'PASSED' : 'FAILED'}:`,
    { traceId, ...completeResult.summary }
  );

  return completeResult;
}