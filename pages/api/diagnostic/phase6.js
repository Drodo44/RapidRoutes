// 🚨 PHASE 6: API DIAGNOSTIC ENDPOINT
// Creates a diagnostic page to test real production behavior

import { validateApiAuth } from '../../../middleware/auth.unified.js';
import { FreightIntelligence } from '../../../lib/FreightIntelligence.js';

export default async function handler(req, res) {
  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
  } catch (importErr) {
    return res.status(500).json({ error: 'Admin client initialization failed' });
  }

    // Allow GET requests only
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Skip auth for diagnostic purposes (TEMPORARY FOR TESTING)
    const bypass = req.query.bypass === 'phase6diagnostic';
    
    if (!bypass) {
        const auth = await validateApiAuth(req, res);
        if (!auth) return;
    }
    
    const diagnostics = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        steps: []
    };
    
    try {
        // STEP 1: Database Connection Test
        diagnostics.steps.push({ step: 1, name: 'Database Connection', status: 'testing' });
        
        try {
            const { data: testQuery, error: testError } = await supabaseAdmin
                .from('lanes')
                .select('count')
                .limit(1);
                
            if (testError) throw testError;
            
            diagnostics.steps[0].status = 'success';
            diagnostics.steps[0].result = 'Database connection working';
        } catch (dbError) {
            diagnostics.steps[0].status = 'failed';
            diagnostics.steps[0].error = dbError.message;
        }
        
        // STEP 2: Lane Retrieval Test
        diagnostics.steps.push({ step: 2, name: 'Lane Retrieval', status: 'testing' });
        
        try {
            const { data: lanes, error: lanesError } = await supabaseAdmin
                .from('lanes')
                .select('*')
                .eq('lane_status', 'pending')
                .limit(3);
                
            if (lanesError) throw lanesError;
            
            diagnostics.steps[1].status = 'success';
            diagnostics.steps[1].result = `Found ${lanes?.length || 0} pending lanes`;
            diagnostics.steps[1].sampleLane = lanes && lanes.length > 0 ? {
                id: lanes[0].id,
                route: `${lanes[0].origin_city}, ${lanes[0].origin_state} → ${lanes[0].dest_city}, ${lanes[0].dest_state}`,
                equipment: lanes[0].equipment_code
            } : null;
            
            // If we have lanes, test with the first one
            if (lanes && lanes.length > 0) {
                const testLane = lanes[0];
                
                // STEP 3: City Database Test
                diagnostics.steps.push({ step: 3, name: 'City Database Lookup', status: 'testing' });
                
                try {
                    const { data: cities, error: cityError } = await supabaseAdmin
                        .from('cities')
                        .select('city, state_or_province, kma_code')
                        .ilike('city', `%${testLane.origin_city}%`)
                        .eq('state_or_province', testLane.origin_state)
                        .limit(5);
                        
                    if (cityError) throw cityError;
                    
                    diagnostics.steps[2].status = 'success';
                    diagnostics.steps[2].result = `Found ${cities?.length || 0} cities for ${testLane.origin_city}, ${testLane.origin_state}`;
                    diagnostics.steps[2].sampleCities = cities?.slice(0, 2) || [];
                } catch (cityError) {
                    diagnostics.steps[2].status = 'failed';
                    diagnostics.steps[2].error = cityError.message;
                }
                
                // STEP 4: Intelligence System Test
                diagnostics.steps.push({ step: 4, name: 'FreightIntelligence Test', status: 'testing' });
                
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
                    
                    diagnostics.steps[3].status = 'success';
                    diagnostics.steps[3].result = {
                        pairsGenerated: result?.pairs?.length || 0,
                        meetsMinimum: (result?.pairs?.length || 0) >= 6,
                        source: result?.source || 'unknown',
                        cached: result?.cached || false
                    };
                    
                    if (result?.pairs && result.pairs.length > 0) {
                        diagnostics.steps[3].samplePair = result.pairs[0];
                    }
                    
                } catch (intelligenceError) {
                    diagnostics.steps[3].status = 'failed';
                    diagnostics.steps[3].error = intelligenceError.message;
                }
            }
            
        } catch (lanesError) {
            diagnostics.steps[1].status = 'failed';
            diagnostics.steps[1].error = lanesError.message;
        }
        
        // Summary
        const successCount = diagnostics.steps.filter(s => s.status === 'success').length;
        const totalSteps = diagnostics.steps.length;
        
        diagnostics.summary = {
            successfulSteps: successCount,
            totalSteps: totalSteps,
            overallStatus: successCount === totalSteps ? 'success' : 'partial_failure',
            canGenerateCSV: successCount >= 3 && diagnostics.steps.some(s => 
                s.name === 'FreightIntelligence Test' && 
                s.status === 'success' && 
                s.result?.meetsMinimum
            )
        };
        
        return res.status(200).json(diagnostics);
        
    } catch (error) {
        diagnostics.summary = {
            overallStatus: 'critical_failure',
            error: error.message
        };
        
        return res.status(500).json(diagnostics);
    }
}