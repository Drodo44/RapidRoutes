// 🚨 PHASE 6: PRODUCTION VERIFICATION WITH REAL DATA
// Test actual lane exports using real pending lanes from production database

import dotenv from 'dotenv';
dotenv.config();

import { adminSupabase } from './utils/supabaseClient.js';
import { FreightIntelligence } from './lib/FreightIntelligence.js';
import { generateDatCsvRows, toCsv, DAT_HEADERS } from './lib/datCsvBuilder.js';
import { intelligentCache } from './lib/intelligentCache.js';

async function phase6ProductionVerification() {
    console.log('🚨 PHASE 6: PRODUCTION VERIFICATION WITH REAL DATA');
    console.log('Testing with actual pending lanes from production database...\n');
    
    try {
        console.log('🔄 STEP 1: Testing database connection...');
        
        // Test basic database connectivity
        const { data: testData, error: testError } = await adminSupabase
            .from('lanes')
            .select('count')
            .limit(1);
            
        if (testError) {
            console.log('❌ Database connection failed:', testError);
            return false;
        }
        
        console.log('✅ Database connection successful');
        
        console.log('\n🔄 STEP 2: Retrieving real pending lanes...');
        
        const { data: pendingLanes, error: lanesError } = await adminSupabase
            .from('lanes')
            .select('*')
            .eq('lane_status', 'pending')
            .order('created_at', { ascending: false })
            .limit(5);
            
        if (lanesError) {
            console.log('❌ Failed to retrieve pending lanes:', lanesError);
            return false;
        }
        
        if (!pendingLanes || pendingLanes.length === 0) {
            console.log('❌ No pending lanes found in database');
            
            // Try to get any lanes
            const { data: anyLanes, error: anyError } = await adminSupabase
                .from('lanes')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);
                
            if (anyError || !anyLanes || anyLanes.length === 0) {
                console.log('❌ No lanes found in database at all');
                return false;
            }
            
            console.log(`📋 Found ${anyLanes.length} lanes (not pending). Using first one for testing:`)
            pendingLanes = anyLanes;
        }
        
        console.log(`✅ Retrieved ${pendingLanes.length} lanes from database`);
        
        // Select the most promising lane (Cincinnati area if available)
        let testLane = pendingLanes.find(lane => 
            lane.origin_city?.toLowerCase().includes('cincinnati') ||
            lane.dest_city?.toLowerCase().includes('philadelphia') ||
            lane.origin_city?.toLowerCase().includes('columbus') ||
            lane.dest_city?.toLowerCase().includes('pittsburgh')
        ) || pendingLanes[0];
        
        console.log('\n📊 Selected Real Lane for Testing:');
        console.log(`  ID: ${testLane.id}`);
        console.log(`  Route: ${testLane.origin_city}, ${testLane.origin_state} → ${testLane.dest_city}, ${testLane.dest_state}`);
        console.log(`  Equipment: ${testLane.equipment_code}`);
        console.log(`  Weight: ${testLane.weight_lbs} lbs`);
        console.log(`  Status: ${testLane.status}`);
        console.log(`  Created: ${testLane.created_at}`);
        
        console.log('\n🔄 STEP 3: Testing city database lookups directly...');
        
        // Test origin city lookup
        const { data: originCities, error: originError } = await adminSupabase
            .from('cities')
            .select('city, state_or_province, zip, kma_code, kma_name')
            .ilike('city', `%${testLane.origin_city}%`)
            .eq('state_or_province', testLane.origin_state)
            .limit(10);
            
        if (originError) {
            console.log('❌ Origin city lookup failed:', originError);
            return false;
        }
        
        console.log(`✅ Origin city lookup successful: ${originCities?.length || 0} cities found`);
        if (originCities && originCities.length > 0) {
            console.log('  Sample origin city:', originCities[0]);
        }
        
        // Test destination city lookup  
        const { data: destCities, error: destError } = await adminSupabase
            .from('cities')
            .select('city, state_or_province, zip, kma_code, kma_name')
            .ilike('city', `%${testLane.dest_city}%`)
            .eq('state_or_province', testLane.dest_state)
            .limit(10);
            
        if (destError) {
            console.log('❌ Destination city lookup failed:', destError);
            return false;
        }
        
        console.log(`✅ Destination city lookup successful: ${destCities?.length || 0} cities found`);
        if (destCities && destCities.length > 0) {
            console.log('  Sample destination city:', destCities[0]);
        }
        
        if ((originCities?.length || 0) === 0 || (destCities?.length || 0) === 0) {
            console.log('⚠️  WARNING: One or both cities not found in database');
            console.log('   This explains why intelligence system fails');
            
            // Try broader search
            console.log('\n🔍 Trying broader city search...');
            const { data: allCities, error: allError } = await adminSupabase
                .from('cities')
                .select('city, state_or_province, count')
                .eq('state_or_province', testLane.origin_state)
                .limit(10);
                
            if (allCities && allCities.length > 0) {
                console.log(`📍 Available cities in ${testLane.origin_state}:`);
                allCities.forEach(city => {
                    console.log(`    ${city.city}, ${city.state_or_province}`);
                });
            }
        }
        
        console.log('\n🔄 STEP 4: Testing FreightIntelligence with real lane data...');
        
        try {
            const intelligence = new FreightIntelligence();
            const result = await intelligence.generateDiversePairs({
                origin: {
                    city: testLane.origin_city,
                    state: testLane.origin_state,
                    zip: testLane.origin_zip
                },
                destination: {
                    city: testLane.dest_city,
                    state: testLane.dest_state,
                    zip: testLane.dest_zip
                },
                equipment: testLane.equipment_code
            });
            
            console.log('✅ FreightIntelligence completed successfully');
            console.log(`  Pairs generated: ${result?.pairs?.length || 0}`);
            console.log(`  Source: ${result?.source || 'unknown'}`);
            console.log(`  Cached: ${result?.cached || false}`);
            console.log(`  Error: ${result?.error || 'none'}`);
            
            if (result?.pairs && result.pairs.length > 0) {
                console.log('  Sample pair:', JSON.stringify(result.pairs[0], null, 2));
                
                if (result.pairs.length >= 6) {
                    console.log('✅ Minimum 6 pairs requirement: PASSED');
                } else {
                    console.log('❌ Minimum 6 pairs requirement: FAILED');
                    console.log('   This will cause 422 errors in API');
                }
            } else {
                console.log('❌ No pairs generated - this explains 422 errors');
            }
            
        } catch (intelligenceError) {
            console.log('❌ FreightIntelligence failed:', intelligenceError.message);
            console.log('   Stack:', intelligenceError.stack);
            return false;
        }
        
        console.log('\n🔄 STEP 5: Testing generateDatCsvRows with real lane...');
        
        try {
            const csvRows = await generateDatCsvRows(testLane);
            
            console.log('✅ generateDatCsvRows completed');
            console.log(`  Rows generated: ${csvRows?.length || 0}`);
            
            if (!Array.isArray(csvRows) || csvRows.length === 0) {
                console.log('❌ No CSV rows generated - this explains 422 errors');
                return false;
            }
            
            console.log('✅ CSV rows generated successfully');
            
            // Test CSV conversion
            const csv = toCsv(DAT_HEADERS, csvRows);
            
            if (!csv || typeof csv !== 'string') {
                console.log('❌ CSV conversion failed');
                return false;
            }
            
            console.log('✅ CSV conversion successful');
            console.log(`  CSV length: ${csv.length} characters`);
            
            // Validate CSV structure
            const lines = csv.split('\n').filter(line => line.trim());
            const headerLine = lines[0];
            const dataLines = lines.slice(1);
            
            console.log(`  CSV structure: ${lines.length} total lines (1 header + ${dataLines.length} data)`);
            
            const headerCount = headerLine.split(',').length;
            console.log(`  Header count: ${headerCount}/24`);
            
            if (headerCount === 24 && dataLines.length >= 12) {
                console.log('✅ CSV meets DAT requirements (24 headers, 12+ rows)');
                
                console.log('\n📄 REAL CSV PREVIEW:');
                console.log('HEADERS:', headerLine.substring(0, 100) + '...');
                console.log('ROW 1  :', dataLines[0]?.substring(0, 100) + '...');
                console.log('ROW 2  :', dataLines[1]?.substring(0, 100) + '...');
                if (dataLines.length > 2) {
                    console.log(`ROW ${dataLines.length} :`, dataLines[dataLines.length - 1]?.substring(0, 100) + '...');
                }
                
                return true;
            } else {
                console.log('❌ CSV does not meet DAT requirements');
                return false;
            }
            
        } catch (csvError) {
            console.log('❌ CSV generation failed:', csvError.message);
            return false;
        }
        
    } catch (error) {
        console.log('\n💥 PHASE 6 PRODUCTION TEST FAILED:');
        console.log('Error type:', error.constructor.name);
        console.log('Error message:', error.message);
        console.log('Error stack:', error.stack);
        return false;
    }
}

// Run the production verification
if (process.argv[1] === new URL(import.meta.url).pathname) {
    phase6ProductionVerification()
        .then(success => {
            if (success) {
                console.log('\n🎉 PHASE 6 PRODUCTION VERIFICATION: SUCCESS');
                console.log('Real lane data exports working correctly!');
                process.exit(0);
            } else {
                console.log('\n🚨 PHASE 6 PRODUCTION VERIFICATION: FAILED');
                console.log('Identified issues with real data processing.');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('Phase 6 production test crashed:', error);
            process.exit(1);
        });
}

export { phase6ProductionVerification };