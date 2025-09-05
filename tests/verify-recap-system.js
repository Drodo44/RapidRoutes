// tests/verify-recap-system.js
import { recapSystem } from '../lib/RecapSystem.js';
import { supabase } from '../utils/supabaseClient.js';

async function verifyRecapSystem() {
    console.log('Verifying Recap System...');
    
    try {
        // Create test lane
        const { data: lane } = await supabase
            .from('lanes')
            .insert({
                origin_city: 'Chicago',
                origin_state: 'IL',
                dest_city: 'Atlanta',
                dest_state: 'GA',
                equipment_code: 'V',
                weight_lbs: 45000
            })
            .select()
            .single();
        
        // Generate recap
        const recap = await recapSystem.generateRecap(lane.id);
        
        // Verify recap structure
        if (!recap.insights || !Array.isArray(recap.insights)) {
            throw new Error('Missing or invalid insights');
        }
        
        // Verify intelligent insights
        const hasValidInsights = recap.insights.some(insight => 
            insight.type && insight.message && insight.data
        );
        
        if (!hasValidInsights) {
            throw new Error('No valid intelligent insights generated');
        }
        
        // Test CSV export
        const csv = await recapSystem.exportRecapCSV(lane.id);
        if (!csv.includes('RR Number')) {
            throw new Error('CSV export missing RR Number column');
        }
        
        console.log('✅ Recap System verification passed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Recap System verification failed:', error);
        process.exit(1);
    }
}

verifyRecapSystem();
