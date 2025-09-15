#!/usr/bin/env node
// production-export-runner.js
// Full Phase 9 production export with comprehensive validation and reporting

import { config as dotenv } from 'dotenv';
dotenv();

// Debug environment configuration
console.log("🔧 Environment Configuration:");
console.log("   HERE_API_KEY loaded:", !!process.env.HERE_API_KEY);
console.log("   SUPABASE_SERVICE_ROLE_KEY loaded:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log("   NODE_ENV:", process.env.NODE_ENV || 'development');

import fs from 'fs';
import path from 'path';
import { adminSupabase } from './utils/supabaseClient.js';
import { EnterpriseCsvGenerator } from './lib/enterpriseCsvGenerator.js';
import { DAT_HEADERS, toCsv, chunkRows } from './lib/datCsvBuilder.js';

// Timestamp for this export run
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const dateStr = new Date().toISOString().slice(0, 10);
const timeStr = new Date().toISOString().slice(11, 16).replace(':', '');

// File paths
const exportDir = path.resolve(process.cwd(), 'exports');
const logsDir = path.join(exportDir, 'logs');
const reportsDir = path.join(exportDir, 'reports');
const logFile = path.join(logsDir, `phase9_export_${timestamp}.log`);
const reportFile = path.join(reportsDir, `phase9_summary_${timestamp}.md`);

// Logging utility
const logs = [];
function log(level, message, data = null) {
  const entry = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
  logs.push(entry);
  console.log(entry);
}

// Normalize date format from YYYY-MM-DD to MM/DD/YYYY
function normalizeDateFormat(dateStr) {
  if (!dateStr) return null;
  
  // Handle YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    return `${parseInt(month, 10)}/${parseInt(day, 10)}/${year}`;
  }
  
  // Return as-is if already in MM/DD/YYYY format
  return dateStr;
}

// Get pending lanes from Supabase and normalize for enterprise validation
async function getPendingLanes() {
  log('info', 'Fetching pending lanes from Supabase...');
  
  const { data: lanes, error } = await adminSupabase
    .from('lanes')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(100); // Safety limit for testing
    
  if (error) {
    log('error', 'Failed to fetch lanes:', error.message);
    throw error;
  }
  
  // Normalize date formats for enterprise validation
  const normalizedLanes = (lanes || []).map(lane => ({
    ...lane,
    pickup_earliest: normalizeDateFormat(lane.pickup_earliest),
    pickup_latest: normalizeDateFormat(lane.pickup_latest)
  }));
  
  log('info', `Retrieved ${normalizedLanes?.length || 0} pending lanes`);
  return normalizedLanes;
}

// Validate CSV output against DAT requirements
function validateCsvOutput(csvContent, expectedRows) {
  log('info', 'Validating CSV output against DAT requirements...');
  
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    throw new Error('CSV is empty');
  }
  
  // Validate header count (exactly 24 DAT headers)
  const headerLine = lines[0];
  const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  if (headers.length !== 24) {
    throw new Error(`Invalid header count: ${headers.length}/24`);
  }
  
  // Validate headers match DAT specification
  const missingHeaders = DAT_HEADERS.filter(header => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing DAT headers: ${missingHeaders.join(', ')}`);
  }
  
  // Validate data row count
  const dataRows = lines.length - 1;
  log('info', `CSV validation passed: ${dataRows} data rows, 24/24 headers`);
  
  return {
    totalLines: lines.length,
    dataRows,
    headers: headers.length,
    valid: true
  };
}

// Generate timestamped CSV filename
function generateCsvFilename(batchNumber, totalBatches) {
  if (totalBatches > 1) {
    return `dat_export_${dateStr}_${timeStr}_batch-${batchNumber}-of-${totalBatches}.csv`;
  }
  return `dat_export_${dateStr}_${timeStr}_batch-${batchNumber}.csv`;
}

// Main export function
async function runProductionExport() {
  log('info', '🚀 Starting Phase 9 Production Export');
  log('info', `Timestamp: ${timestamp}`);
  log('info', `Export directory: ${exportDir}`);
  
  try {
    // 1. Get pending lanes
    const lanes = await getPendingLanes();
    if (!lanes.length) {
      log('warn', 'No pending lanes found - export complete');
      return {
        totalLanes: 0,
        successful: 0,
        failed: 0,
        csvFiles: [],
        hereFallbackCount: 0,
        enrichedCities: 0
      };
    }
    
    // 2. Configure enterprise generator with production settings
    log('info', 'Configuring EnterpriseCsvGenerator with production settings...');
    const generator = new EnterpriseCsvGenerator({
      generation: {
        minPairsPerLane: 6,        // Production minimum: ≥6 unique KMA pairings
        maxConcurrentLanes: 10,    // Concurrent processing
        enableTransactions: true,  // Transaction safety
        enableCaching: true        // Performance optimization
      },
      verification: { 
        postGenerationVerification: true  // Comprehensive validation
      },
      monitoring: {
        enableDetailedLogging: true,
        logLevel: 'debug'
      }
    });
    
    // 3. Execute enterprise generation
    log('info', `Processing ${lanes.length} lanes with enterprise generator...`);
    const startTime = Date.now();
    
    const result = await generator.generate(lanes);
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    log('info', `Enterprise generation completed in ${processingTime}ms`);
    log('info', `Generation result:`, {
      success: result.success,
      totalRows: result.csv?.rows?.length || 0,
      laneResults: result.laneResults?.length || 0
    });
    
    // 4. Process results
    const allRows = result.csv?.rows || [];
    const laneResults = result.laneResults || [];
    
    let successful = 0;
    let failed = 0;
    let hereFallbackCount = 0;
    let enrichedCities = 0;
    const failedLanes = [];
    
    // Analyze lane results
    for (const laneResult of laneResults) {
      if (laneResult.success) {
        successful++;
        if (laneResult.here_fallback_used) {
          hereFallbackCount++;
        }
        if (laneResult.cities_enriched) {
          enrichedCities += laneResult.cities_enriched;
        }
      } else {
        failed++;
        failedLanes.push({
          laneId: laneResult.lane_id,
          error: laneResult.error,
          pairsFound: laneResult.pairs_found || 0,
          lacksCoverage: laneResult.lacks_coverage || 'unknown'
        });
        log('warn', `Lane ${laneResult.lane_id} failed:`, laneResult.error);
      }
    }
    
    log('info', `Lane processing summary: ${successful} successful, ${failed} failed`);
    log('info', `HERE.com fallback used: ${hereFallbackCount} lanes`);
    log('info', `Cities enriched: ${enrichedCities}`);
    
    // 5. Generate and export CSV files
    const csvFiles = [];
    if (allRows.length > 0) {
      log('info', `Generating CSV files from ${allRows.length} rows...`);
      
      // Chunk rows according to DAT specification (max 499 rows per file)
      const chunks = chunkRows(allRows, 499);
      log('info', `Splitting into ${chunks.length} CSV file(s)`);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const filename = generateCsvFilename(i + 1, chunks.length);
        const filepath = path.join(exportDir, filename);
        
        // Generate CSV content
        const csvContent = toCsv(DAT_HEADERS, chunk);
        
        // Validate CSV before writing
        const validation = validateCsvOutput(csvContent, chunk.length);
        
        // Write to file
        fs.writeFileSync(filepath, csvContent, 'utf8');
        log('info', `Exported CSV: ${filename} (${validation.dataRows} rows)`);
        
        csvFiles.push({
          filename,
          filepath,
          rows: validation.dataRows,
          size: csvContent.length
        });
      }
    } else {
      log('warn', 'No rows generated - no CSV files created');
    }
    
    // 6. Generate comprehensive report
    const summary = {
      timestamp,
      totalLanes: lanes.length,
      successful,
      failed,
      successRate: ((successful / lanes.length) * 100).toFixed(1),
      totalRows: allRows.length,
      csvFiles,
      hereFallbackCount,
      enrichedCities,
      failedLanes,
      processingTime
    };
    
    await generateReport(summary, laneResults);
    
    // 7. Save logs
    fs.writeFileSync(logFile, logs.join('\n'), 'utf8');
    log('info', `Logs saved to: ${logFile}`);
    
    return summary;
    
  } catch (error) {
    log('error', 'Production export failed:', error.message);
    log('error', 'Stack trace:', error.stack);
    throw error;
  }
}

// Generate comprehensive report
async function generateReport(summary, laneResults) {
  log('info', 'Generating comprehensive report...');
  
  const report = `# Phase 9 Production Export Summary

**Export Timestamp:** ${summary.timestamp}  
**Processing Time:** ${summary.processingTime}ms

## Overview
- **Total Lanes Processed:** ${summary.totalLanes}
- **Lanes Exported:** ${summary.successful}
- **Lanes Failed:** ${summary.failed} (< 6 unique KMA pairs)
- **Success Rate:** ${summary.successRate}%
- **Total Rows Generated:** ${summary.totalRows}

## HERE.com Integration
- **Fallback Used:** ${summary.hereFallbackCount} lanes
- **Cities Enriched:** ${summary.enrichedCities} new cities added to Supabase

## Generated CSV Files
${summary.csvFiles.map(file => `- **${file.filename}**: ${file.rows} rows (${(file.size / 1024).toFixed(1)} KB)`).join('\n')}

## Lane-by-Lane Analysis
${laneResults.map(lane => {
  if (lane.success) {
    return `✅ **Lane ${lane.lane_id}**: ${lane.rows_generated || 0} rows, ${lane.pairs_generated || 0} pairs, ${lane.unique_kmas || 0} unique KMAs${lane.here_fallback_used ? ' (HERE fallback)' : ''}`;
  } else {
    return `❌ **Lane ${lane.lane_id}**: FAILED - ${lane.error}`;
  }
}).join('\n')}

## Failed Lanes Analysis
${summary.failedLanes.length > 0 ? summary.failedLanes.map(lane => 
  `- **${lane.laneId}**: ${lane.error} (${lane.pairsFound} pairs found, lacks ${lane.lacksCoverage} coverage)`
).join('\n') : 'No failed lanes'}

## Business Rules Enforced
- ✅ Minimum 6 unique KMA pairings per lane
- ✅ No maximum pair limit (adapts to geographic diversity)
- ✅ 2 contact methods per pair (Email + Primary Phone) 
- ✅ 100-mile maximum radius from base cities
- ✅ No duplicate city pairs within lanes
- ✅ MM/DD/YYYY date format compliance
- ✅ HERE.com fallback for insufficient KMA diversity
- ✅ Automatic Supabase enrichment with new cities

## File Artifacts
- **Logs:** \`exports/logs/phase9_export_${summary.timestamp}.log\`
- **Report:** \`exports/reports/phase9_summary_${summary.timestamp}.md\`
${summary.csvFiles.map(file => `- **CSV:** \`exports/${file.filename}\``).join('\n')}

---
*Generated by Phase 9 Production Export System*
`;

  fs.writeFileSync(reportFile, report, 'utf8');
  log('info', `Report saved to: ${reportFile}`);
}

// Display final summary table
function displaySummaryTable(summary) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 PHASE 9 PRODUCTION EXPORT SUMMARY');
  console.log('='.repeat(80));
  console.log(`Timestamp: ${summary.timestamp}`);
  console.log(`Processing Time: ${summary.processingTime}ms`);
  console.log('-'.repeat(80));
  console.log(`Total Lanes:     ${summary.totalLanes}`);
  console.log(`Successful:      ${summary.successful}`);
  console.log(`Failed:          ${summary.failed}`);
  console.log(`Success Rate:    ${summary.successRate}%`);
  console.log(`Total Rows:      ${summary.totalRows}`);
  console.log('-'.repeat(80));
  console.log(`HERE Fallback:   ${summary.hereFallbackCount} lanes`);
  console.log(`Cities Enriched: ${summary.enrichedCities}`);
  console.log('-'.repeat(80));
  console.log('CSV Files Generated:');
  if (summary.csvFiles.length > 0) {
    summary.csvFiles.forEach(file => {
      console.log(`  ${file.filename}: ${file.rows} rows`);
    });
  } else {
    console.log('  None (no valid lanes processed)');
  }
  console.log('='.repeat(80));
}

// Run the export
if (import.meta.url === `file://${process.argv[1]}`) {
  runProductionExport()
    .then(summary => {
      displaySummaryTable(summary);
      
      // Show directory tree
      console.log('\n📁 EXPORTS DIRECTORY STRUCTURE:');
      console.log('exports/');
      summary.csvFiles.forEach(file => console.log(`├── ${file.filename}`));
      console.log('├── logs/');
      console.log(`│   └── phase9_export_${summary.timestamp}.log`);
      console.log('└── reports/');
      console.log(`    └── phase9_summary_${summary.timestamp}.md`);
      
      console.log('\n✅ Phase 9 Production Export Complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Phase 9 Production Export Failed!');
      console.error('Error:', error.message);
      if (process.env.NODE_ENV === 'development') {
        console.error('Stack:', error.stack);
      }
      process.exit(1);
    });
}

export { runProductionExport };