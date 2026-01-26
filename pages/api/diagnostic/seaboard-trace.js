// 🛠️ SEABOARD → LEOLA LANE DIAGNOSTIC TRACE
// Comprehensive verbose logging for specific lane failure analysis

import { validateApiAuth } from '../../../middleware/auth.unified.js';
import { FreightIntelligence } from '../../../lib/FreightIntelligence.js';

export default async function handler(req, res) {
  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
  } catch (importErr) {
    return res.status(500).json({ error: 'Admin client initialization failed' });
  }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Skip auth for diagnostic purposes
    const bypass = req.query.bypass === 'seaboardtrace';
    
    if (!bypass) {
        const auth = await validateApiAuth(req, res);
        if (!auth) return;
    }
    
    const trace = {
        timestamp: new Date().toISOString(),
        lane: 'Seaboard, NC → Leola, PA (FD)',
        steps: []
    };
    
    try {
        // STEP 1: Find the specific lane in database
        trace.steps.push({ step: 1, name: 'Lane Identification', status: 'running' });
        
        const { data: lanes, error: lanesError } = await supabaseAdmin
            .from('lanes')
            .select('*')
            .ilike('origin_city', '%Seaboard%')
            .ilike('dest_city', '%Leola%')
            .eq('equipment_code', 'FD')
            .limit(1);
            
        if (lanesError || !lanes || lanes.length === 0) {
            trace.steps[0].status = 'failed';
            trace.steps[0].error = 'Seaboard → Leola lane not found';
            return res.status(404).json(trace);
        }
        
        const targetLane = lanes[0];
        trace.steps[0].status = 'success';
        trace.steps[0].laneData = {
            id: targetLane.id,
            origin: `${targetLane.origin_city}, ${targetLane.origin_state}`,
            destination: `${targetLane.dest_city}, ${targetLane.dest_state}`,
            equipment: targetLane.equipment_code,
            weight: targetLane.weight_lbs
        };
        
        // STEP 2: Database City Discovery
        trace.steps.push({ step: 2, name: 'Database City Discovery', status: 'running' });
        
        // Origin cities
        const { data: originCities, error: originError } = await supabaseAdmin
            .from('cities')
            .select('city, state_or_province, zip, kma_code, kma_name, latitude, longitude')
            .ilike('city', `%${targetLane.origin_city}%`)
            .eq('state_or_province', targetLane.origin_state)
            .limit(20);
            
        // Destination cities  
        const { data: destCities, error: destError } = await supabaseAdmin
            .from('cities')
            .select('city, state_or_province, zip, kma_code, kma_name, latitude, longitude')
            .ilike('city', `%${targetLane.dest_city}%`)
            .eq('state_or_province', targetLane.dest_state)
            .limit(20);
            
        if (originError || destError) {
            trace.steps[1].status = 'failed';
            trace.steps[1].error = { originError, destError };
            return res.status(500).json(trace);
        }
        
        trace.steps[1].status = 'success';
        trace.steps[1].results = {
            originCitiesFound: originCities?.length || 0,
            destinationCitiesFound: destCities?.length || 0,
            originCities: originCities?.map(c => ({ city: c.city, kma: c.kma_code })) || [],
            destinationCities: destCities?.map(c => ({ city: c.city, kma: c.kma_code })) || []
        };
        
        // STEP 3: KMA Analysis
        trace.steps.push({ step: 3, name: 'KMA Diversity Analysis', status: 'running' });
        
        const originKMAs = [...new Set(originCities?.map(c => c.kma_code).filter(Boolean) || [])];
        const destKMAs = [...new Set(destCities?.map(c => c.kma_code).filter(Boolean) || [])];
        
        trace.steps[2].status = 'success';
        trace.steps[2].results = {
            uniqueOriginKMAs: originKMAs.length,
            uniqueDestKMAs: destKMAs.length,
            originKMAs: originKMAs,
            destKMAs: destKMAs,
            theoreticalMaxPairs: Math.min(originKMAs.length, destKMAs.length)
        };
        
        // STEP 4: HERE.com Analysis Preparation
        trace.steps.push({ step: 4, name: 'HERE.com Requirements Check', status: 'running' });
        
        const needsHEREFallback = (originCities?.length || 0) < 6 || (destCities?.length || 0) < 6;
        trace.steps[3].status = 'success';
        trace.steps[3].results = {
            needsHEREFallback: needsHEREFallback,
            originCityCount: originCities?.length || 0,
            destCityCount: destCities?.length || 0,
            hereAPIConfigured: !!process.env.HERE_API_KEY
        };
        
        // STEP 5: Full FreightIntelligence Trace with Custom Logging
        trace.steps.push({ step: 5, name: 'FreightIntelligence Deep Trace', status: 'running' });
        
        // Create intelligence instance with enhanced logging
        const intelligence = new FreightIntelligence();
        
        // Capture console output during intelligence processing
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        
        const capturedLogs = [];
        const captureLog = (level, ...args) => {
            capturedLogs.push({
                level: level,
                timestamp: new Date().toISOString(),
                message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')
            });
            // Still call original
            if (level === 'log') originalLog(...args);
            else if (level === 'error') originalError(...args);
            else if (level === 'warn') originalWarn(...args);
        };
        
        console.log = (...args) => captureLog('log', ...args);
        console.error = (...args) => captureLog('error', ...args);
        console.warn = (...args) => captureLog('warn', ...args);
        
        try {
            const result = await intelligence.generateDiversePairs({
                origin: {
                    city: targetLane.origin_city,
                    state: targetLane.origin_state,
                    zip: targetLane.origin_zip
                },
                destination: {
                    city: targetLane.dest_city,
                    state: targetLane.dest_state,
                    zip: targetLane.dest_zip
                },
                equipment: targetLane.equipment_code
            });
            
            // Restore console functions
            console.log = originalLog;
            console.error = originalError;
            console.warn = originalWarn;
            
            trace.steps[4].status = 'success';
            trace.steps[4].results = {
                pairsGenerated: result?.pairs?.length || 0,
                source: result?.source || 'unknown',
                cached: result?.cached || false,
                error: result?.error || null,
                capturedLogs: capturedLogs,
                samplePairs: result?.pairs?.slice(0, 3) || [],
                allPairs: result?.pairs || []
            };
            
            // STEP 6: Pair Generation Analysis
            trace.steps.push({ step: 6, name: 'Pair Generation Breakdown', status: 'running' });
            
            if (result?.pairs && result.pairs.length > 0) {
                const pairAnalysis = {
                    totalPairs: result.pairs.length,
                    uniqueOriginKMAs: [...new Set(result.pairs.map(p => p.pickup?.kma_code).filter(Boolean))],
                    uniqueDestKMAs: [...new Set(result.pairs.map(p => p.delivery?.kma_code).filter(Boolean))],
                    pairSources: {},
                    geographicScores: result.pairs.map(p => p.score || 0),
                    contactMethods: result.pairs.map(p => p.contactMethod || 'unknown')
                };
                
                // Analyze pair sources
                result.pairs.forEach(pair => {
                    const source = pair.source || 'database';
                    pairAnalysis.pairSources[source] = (pairAnalysis.pairSources[source] || 0) + 1;
                });
                
                trace.steps[5].status = 'success';
                trace.steps[5].results = pairAnalysis;
            } else {
                trace.steps[5].status = 'failed';
                trace.steps[5].error = 'No pairs generated';
            }
            
        } catch (intelligenceError) {
            // Restore console functions
            console.log = originalLog;
            console.error = originalError;
            console.warn = originalWarn;
            
            trace.steps[4].status = 'failed';
            trace.steps[4].error = intelligenceError.message;
            trace.steps[4].capturedLogs = capturedLogs;
        }
        
        // STEP 7: Final Analysis
        trace.steps.push({ step: 7, name: 'Failure Analysis', status: 'running' });
        
        const finalAnalysis = {
            pairsGenerated: trace.steps[4]?.results?.pairsGenerated || 0,
            minimumRequired: 6,
            shortfall: 6 - (trace.steps[4]?.results?.pairsGenerated || 0),
            possibleCauses: []
        };
        
        if (finalAnalysis.pairsGenerated < 6) {
            if ((originCities?.length || 0) < 3) {
                finalAnalysis.possibleCauses.push('Insufficient origin cities in database');
            }
            if ((destCities?.length || 0) < 3) {
                finalAnalysis.possibleCauses.push('Insufficient destination cities in database');
            }
            if (originKMAs.length < 6) {
                finalAnalysis.possibleCauses.push('Insufficient unique origin KMAs');
            }
            if (destKMAs.length < 6) {
                finalAnalysis.possibleCauses.push('Insufficient unique destination KMAs');
            }
            if (needsHEREFallback && !process.env.HERE_API_KEY) {
                finalAnalysis.possibleCauses.push('HERE.com fallback needed but API key not configured');
            }
            
            // Check if HERE was supposed to be triggered but wasn't
            const hereWasUsed = capturedLogs.some(log => 
                log.message.includes('HERE') || 
                log.message.includes('fallback') ||
                log.message.includes('discover')
            );
            
            if (needsHEREFallback && !hereWasUsed) {
                finalAnalysis.possibleCauses.push('HERE.com fallback should have triggered but did not');
            }
        }
        
        trace.steps[6].status = 'success';
        trace.steps[6].results = finalAnalysis;
        
        // Summary
        trace.summary = {
            lane: trace.lane,
            pairsGenerated: finalAnalysis.pairsGenerated,
            minimumRequired: finalAnalysis.minimumRequired,
            success: finalAnalysis.pairsGenerated >= 6,
            primaryIssue: finalAnalysis.possibleCauses[0] || 'Unknown',
            allIssues: finalAnalysis.possibleCauses,
            databaseCitiesFound: {
                origin: originCities?.length || 0,
                destination: destCities?.length || 0
            },
            kmaAnalysis: {
                originKMAs: originKMAs.length,
                destKMAs: destKMAs.length,
                theoreticalMax: Math.min(originKMAs.length, destKMAs.length)
            }
        };
        
        return res.status(200).json(trace);
        
    } catch (error) {
        return res.status(500).json({
            ...trace,
            error: error.message,
            stack: error.stack
        });
    }
}