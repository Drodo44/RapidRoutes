// Set up freight intelligence directly through Supabase API
import { adminSupabase } from './utils/supabaseClient.js';

async function setupDatabase() {
    console.log('🔧 Setting up Freight Intelligence System');
    console.log('='.repeat(60));

    try {
        // Drop existing table if it exists
        await adminSupabase.rpc('drop_table_if_exists', { table_name: 'freight_intelligence' });

        // Create the main table
        const { error: createError } = await adminSupabase
            .from('freight_intelligence')
            .insert([{
                city_pair_hash: 'INITIALIZE',
                origin_data: {},
                dest_data: {},
                equipment_patterns: { "FD": 0, "V": 0, "R": 0 },
                usage_frequency: 0,
                distance_miles: 0,
                states_crossed: [],
                source: 'INIT'
            }]);

        if (createError) {
            console.log('Creating table structure...');
            
            // Create table with proper structure
            await adminSupabase.rpc('create_freight_intelligence', {
                create_sql: `
                    CREATE TABLE public.freight_intelligence (
                        id SERIAL PRIMARY KEY,
                        city_pair_hash TEXT UNIQUE,
                        origin_data JSONB,
                        dest_data JSONB,
                        equipment_patterns JSONB DEFAULT '{"FD": 0, "V": 0, "R": 0}'::jsonb,
                        usage_frequency INT DEFAULT 1,
                        first_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        distance_miles FLOAT,
                        states_crossed TEXT[],
                        source TEXT DEFAULT 'HERE_API',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE INDEX idx_freight_intelligence_city_pair ON public.freight_intelligence(city_pair_hash);
                    CREATE INDEX idx_freight_intelligence_usage ON public.freight_intelligence(usage_frequency DESC);
                    CREATE INDEX idx_freight_intelligence_equipment ON public.freight_intelligence USING GIN(equipment_patterns);
                    
                    ALTER TABLE public.freight_intelligence ENABLE ROW LEVEL SECURITY;
                    
                    CREATE POLICY freight_intelligence_select ON public.freight_intelligence
                        FOR SELECT TO authenticated
                        USING (true);
                    
                    CREATE POLICY freight_intelligence_insert ON public.freight_intelligence
                        FOR INSERT TO authenticated
                        WITH CHECK (true);
                    
                    CREATE POLICY freight_intelligence_update ON public.freight_intelligence
                        FOR UPDATE TO authenticated
                        USING (true);
                `
            });
        }

        console.log('✅ Database setup complete');
        return true;

    } catch (error) {
        console.error('Database setup error:', error);
        return false;
    }
}

// Run setup
setupDatabase().then(success => {
    if (success) {
        console.log('Ready to test with lanes!');
        // Run the intelligence test
        import('./test-freight-intelligence.js');
    }
}).catch(console.error);
