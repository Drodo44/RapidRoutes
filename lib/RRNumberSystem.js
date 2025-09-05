import { createClient } from '@supabase/supabase-js';

class RRNumberSystem {
    constructor(config = null) {
        let supabaseUrl, supabaseKey;
        
        if (config) {
            supabaseUrl = config.supabaseUrl;
            supabaseKey = config.supabaseKey;
        } else {
            supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
            supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        }
        
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase configuration missing. Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set.');
        }

        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.prefix = 'RR';
        this.numberLength = 5;
    }

    /**
     * Generate a new unique RR number
     * @returns {Promise<string>} A unique RR number in format RR#####
     */
    async generateNewRRNumber() {
        const { data: lastNumber } = await this.supabase
            .from('reference_numbers')
            .select('number')
            .order('created_at', { ascending: false })
            .limit(1);

        let nextNumber;
        if (!lastNumber || lastNumber.length === 0) {
            nextNumber = 10000; // Start from RR10000
        } else {
            nextNumber = parseInt(lastNumber[0].number.slice(2)) + 1;
            if (nextNumber >= 100000) nextNumber = 10000; // Reset to avoid overflow
        }

        // Format and save
        const rrNumber = `${this.prefix}${String(nextNumber).padStart(this.numberLength, '0')}`;
        
        await this.supabase
            .from('reference_numbers')
            .insert([{
                number: rrNumber,
                status: 'active'
            }]);

        return rrNumber;
    }

    /**
     * Look up lane details by RR number
     * @param {string} rrNumber - The RR number to look up
     * @returns {Promise<Object>} Lane details
     */
    async lookupByRRNumber(rrNumber) {
        const { data: reference } = await this.supabase
            .from('reference_numbers')
            .select('lane_id, created_at')
            .eq('number', rrNumber)
            .single();

        if (!reference) return null;

        const { data: lane } = await this.supabase
            .from('lanes')
            .select(`
                *,
                recap:recaps(*)
            `)
            .eq('id', reference.lane_id)
            .single();

        return lane;
    }

    /**
     * Associate an RR number with a lane
     * @param {string} rrNumber - The RR number to associate
     * @param {string} laneId - The lane ID to associate with
     */
    async associateWithLane(rrNumber, laneId) {
        await this.supabase
            .from('reference_numbers')
            .update({ lane_id: laneId })
            .eq('number', rrNumber);
    }
}

export { RRNumberSystem };

// Export as a function instead of a default instance
export const getRRNumberSystem = () => {
    let instance = null;
    try {
        instance = new RRNumberSystem();
    } catch (error) {
        console.warn('RRNumberSystem instance not created:', error.message);
    }
    return instance;
};
