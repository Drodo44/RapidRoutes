// 🚨 PHASE 5: COMPREHENSIVE END-TO-END VALIDATION
// Test the complete pipeline: Input → Intelligence → CSV Builder → File Output

import dotenv from 'dotenv';
dotenv.config();

import { FreightIntelligence } from './lib/FreightIntelligence.js';
import { generateDatCsvRows, toCsv, DAT_HEADERS } from './lib/datCsvBuilder.js';
import { intelligentCache } from './lib/intelligentCache.js';

async function phase5ComprehensiveTest() {
    console.log('🚨 PHASE 5: COMPREHENSIVE END-TO-END VALIDATION');
    console.log('Testing complete pipeline with realistic lane data...\n');
    
    // Test with a realistic lane that should work
    const testLane = {
        id: 'TEST_PHASE5',
        origin_city: 'Cincinnati',
        origin_state: 'OH',
        origin_zip: '45202',
        dest_city: 'Philadelphia',
        dest_state: 'PA',
        dest_zip: '19102',
        equipment_code: 'FD',
        length_ft: 48,
        weight_lbs: 45000,
        full_partial: 'F',
        pickup_earliest: '2025-09-15',
        pickup_latest: '2025-09-17',
        commodity: 'Steel Coils',
        comment: 'Phase 5 validation test',
        randomize_weight: false,
        status: 'pending',
        created_at: new Date().toISOString()
    };
    
    console.log('📊 Test Lane Data:');
    console.log(`  Route: ${testLane.origin_city}, ${testLane.origin_state} → ${testLane.dest_city}, ${testLane.dest_state}`);
    console.log(`  Equipment: ${testLane.equipment_code} (${testLane.length_ft}ft)`);
    console.log(`  Weight: ${testLane.weight_lbs} lbs`);
    
    try {
        console.log('\n🔄 STEP 1: Testing intelligentCache.getIntelligentPairs()...');
        
        const result = await intelligentCache.getIntelligentPairs(
            { 
                city: testLane.origin_city, 
                state: testLane.origin_state,
                zip: testLane.origin_zip 
            },
            { 
                city: testLane.dest_city, 
                state: testLane.dest_state,
                zip: testLane.dest_zip 
            },
            testLane.equipment_code,
            testLane.id
        );
        
        console.log('✅ Intelligence Cache Result:');
        console.log(`  Pairs generated: ${result?.pairs?.length || 0}`);
        console.log(`  Cached: ${result?.cached || false}`);
        console.log(`  Source: ${result?.source || 'unknown'}`);
        console.log(`  Error: ${result?.error || 'none'}`);
        
        if (result?.pairs?.length >= 6) {
            console.log('✅ Minimum 6 pairs requirement: PASSED');
            
            // Sample first pair
            console.log('  Sample pair:', JSON.stringify(result.pairs[0], null, 2));
        } else {
            console.log('❌ Minimum 6 pairs requirement: FAILED');
            console.log('  This will cause 422 errors in production');
            return false;
        }
        
        console.log('\n🔄 STEP 2: Testing generateDatCsvRows()...');
        
        const rows = await generateDatCsvRows(testLane);
        
        console.log('✅ CSV Row Generation Result:');
        console.log(`  Rows generated: ${rows?.length || 0}`);
        console.log(`  Expected minimum: ${6 * 2} (6 pairs × 2 contact methods)`);
        
        if (!Array.isArray(rows)) {
            console.log('❌ CRITICAL: rows is not an array!', typeof rows);
            return false;
        }
        
        if (rows.length < 12) {
            console.log('❌ CRITICAL: Insufficient rows generated');
            return false;
        }
        
        console.log('✅ Minimum row count: PASSED');
        
        // Validate first row structure
        const firstRow = rows[0];
        if (!firstRow || typeof firstRow !== 'object') {
            console.log('❌ CRITICAL: Invalid first row structure');
            return false;
        }
        
        console.log('  Sample row keys:', Object.keys(firstRow));
        
        // Check for required DAT headers in row data
        const missingHeaders = DAT_HEADERS.filter(header => !(header in firstRow));
        if (missingHeaders.length > 0) {
            console.log('❌ CRITICAL: Missing DAT headers in row data:', missingHeaders);
            return false;
        }
        
        console.log('✅ All 24 DAT headers present in row data: PASSED');
        
        console.log('\n🔄 STEP 3: Testing toCsv() conversion...');
        
        const csv = toCsv(DAT_HEADERS, rows);
        
        if (!csv || typeof csv !== 'string') {
            console.log('❌ CRITICAL: toCsv returned non-string:', typeof csv);
            return false;
        }
        
        if (csv.startsWith('{') || csv.startsWith('[')) {
            console.log('❌ CRITICAL: CSV output is JSON!', csv.substring(0, 100));
            return false;
        }
        
        console.log('✅ CSV String Generation: PASSED');
        console.log(`  CSV length: ${csv.length} characters`);
        
        // Validate CSV structure
        const lines = csv.split('\n').filter(line => line.trim());
        const headerLine = lines[0];
        const dataLines = lines.slice(1);
        
        console.log('  CSV lines (total):', lines.length);
        console.log('  CSV data rows:', dataLines.length);
        
        // Check header count
        const headerCount = headerLine.split(',').length;
        if (headerCount !== 24) {
            console.log(`❌ CRITICAL: CSV has ${headerCount} headers, need exactly 24`);
            console.log('Headers found:', headerLine);
            return false;
        }
        
        console.log('✅ CSV Header Count: PASSED (24/24)');
        
        // Validate header content matches DAT spec
        const csvHeaders = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
        const headerMismatches = [];
        
        for (let i = 0; i < DAT_HEADERS.length; i++) {
            if (csvHeaders[i] !== DAT_HEADERS[i]) {
                headerMismatches.push({
                    position: i,
                    expected: DAT_HEADERS[i],
                    actual: csvHeaders[i]
                });
            }
        }
        
        if (headerMismatches.length > 0) {
            console.log('❌ CRITICAL: CSV headers don\'t match DAT spec:', headerMismatches);
            return false;
        }
        
        console.log('✅ CSV Header Content: PASSED (exact DAT match)');
        
        // Sample some data rows
        console.log('\n📄 CSV PREVIEW:');
        console.log('Headers:', headerLine);
        console.log('Row 1:', dataLines[0]);
        console.log('Row 2:', dataLines[1]);
        console.log('...');
        console.log(`Row ${dataLines.length}:`, dataLines[dataLines.length - 1]);
        
        console.log('\n🎉 PHASE 5 COMPREHENSIVE TEST: SUCCESS!');
        console.log('✅ Intelligence system working correctly');
        console.log('✅ CSV generation pipeline functional');
        console.log('✅ DAT compliance validated');
        console.log('✅ No JSON corruption detected');
        console.log('✅ Proper row count achieved');
        
        return true;
        
    } catch (error) {
        console.log('\n💥 PHASE 5 TEST FAILED:');
        console.log('Error type:', error.constructor.name);
        console.log('Error message:', error.message);
        console.log('Error stack:', error.stack);
        return false;
    }
}

// Run the comprehensive test
if (process.argv[1] === new URL(import.meta.url).pathname) {
    phase5ComprehensiveTest()
        .then(success => {
            if (success) {
                console.log('\n🚀 PHASE 5 VALIDATION: COMPLETE SUCCESS');
                console.log('The CSV export system is fully operational!');
                process.exit(0);
            } else {
                console.log('\n🚨 PHASE 5 VALIDATION: FAILED');
                console.log('Additional fixes required.');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('Phase 5 test crashed:', error);
            process.exit(1);
        });
}

export { phase5ComprehensiveTest };