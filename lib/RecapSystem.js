import { getServerSupabase } from './supabaseClient.js';
import { FreightIntelligence } from './FreightIntelligence.js';

class RecapSystem {
    constructor(config = null) {
        // Use the singleton server client
        this.supabase = getServerSupabase();
        this.intelligence = new FreightIntelligence();
    }

    /**
     * Generate a recap for a lane with intelligent insights
     * @param {string} laneId - The lane ID
     * @returns {Promise<Object>} The generated recap
     */
    async generateRecap(laneId) {
        // Get lane details
        const { data: lane } = await this.supabase
            .from('lanes')
            .select('*')
            .eq('id', laneId)
            .single();

        if (!lane) throw new Error('Lane not found');

        // Get all postings for this lane
        const { data: postings } = await this.supabase
            .from('postings')
            .select('*')
            .eq('lane_id', laneId)
            .order('created_at', { ascending: false });

        // Get historical data for intelligent insights
        const historicalData = await this.intelligence.getHistoricalData({
            origin: {
                city: lane.origin_city,
                state: lane.origin_state
            },
            destination: {
                city: lane.dest_city,
                state: lane.dest_state
            },
            equipment: lane.equipment_code
        });

        // Generate intelligent insights
        const insights = this.generateIntelligentInsights(lane, postings, historicalData);

        // Create recap
        const recap = {
            lane_id: laneId,
            postings: postings || [],
            insights: insights,
            generated_at: new Date().toISOString()
        };

        // Save to database
        await this.supabase
            .from('recaps')
            .insert([recap]);

        return recap;
    }

    /**
     * Generate intelligent insights for a lane
     * @private
     */
    generateIntelligentInsights(lane, postings, historicalData) {
        const insights = [];

        // Only add insights if we have meaningful data
        if (historicalData?.volume_trends?.length > 0) {
            insights.push({
                type: 'volume',
                message: `${historicalData.volume_trends[0].direction === 'up' ? 'Increasing' : 'Decreasing'} freight volume in this lane (${historicalData.volume_trends[0].percentage}% change)`,
                data: historicalData.volume_trends[0]
            });
        }

        if (historicalData?.rate_trends?.length > 0) {
            insights.push({
                type: 'rates',
                message: `Rate trends show ${historicalData.rate_trends[0].direction === 'up' ? 'upward' : 'downward'} movement (${historicalData.rate_trends[0].percentage}% change)`,
                data: historicalData.rate_trends[0]
            });
        }

        if (historicalData?.capacity_index) {
            insights.push({
                type: 'capacity',
                message: `Current capacity index: ${historicalData.capacity_index.value} (${historicalData.capacity_index.interpretation})`,
                data: historicalData.capacity_index
            });
        }

        return insights;
    }

    /**
     * Export recap to CSV format
     * @param {string} laneId - The lane ID
     */
    async exportRecapCSV(laneId) {
        const recap = await this.getRecap(laneId);
        if (!recap) throw new Error('Recap not found');

        // Format for CSV
        const rows = [];
        
        // Add header row
        rows.push([
            'Posting Date',
            'Origin',
            'Destination',
            'Equipment',
            'Rate',
            'Volume Index',
            'RR Number'
        ]);

        // Add data rows
        for (const posting of recap.postings) {
            rows.push([
                new Date(posting.created_at).toLocaleDateString(),
                `${posting.origin_city}, ${posting.origin_state}`,
                `${posting.dest_city}, ${posting.dest_state}`,
                posting.equipment_code,
                posting.rate || 'N/A',
                posting.volume_index || 'N/A',
                posting.reference_id
            ]);
        }

        // Convert to CSV string
        return rows.map(row => row.join(',')).join('\n');
    }

    /**
     * Get a recap by lane ID
     * @param {string} laneId - The lane ID
     */
    async getRecap(laneId) {
        const { data } = await this.supabase
            .from('recaps')
            .select(`
                *,
                lane:lanes(*)
            `)
            .eq('lane_id', laneId)
            .order('generated_at', { ascending: false })
            .limit(1)
            .single();

        return data;
    }
}

export { RecapSystem };

// Create default instance only if environment variables are available
let defaultInstance = null;
try {
    defaultInstance = new RecapSystem();
} catch (error) {
    console.warn('Default RecapSystem instance not created:', error.message);
}

export const recapSystem = defaultInstance;
