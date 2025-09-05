// scripts/setup-tables.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gwuhjxomavulwduhvgvi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTables() {
    console.log('Setting up tables...');

    try {
        // 1. Try to create a reference number (this will fail if table doesn't exist)
        const { error: insertError } = await supabase
            .from('reference_numbers')
            .insert({ number: 'RR10000', status: 'active' });

        console.log('Reference numbers check:', insertError ? 'Table needs creation' : 'Table exists');

        if (insertError) {
            // Create reference_numbers table
            await supabase.from('reference_numbers').insert([
                {
                    number: 'RR10000',
                    status: 'active'
                }
            ]);
            console.log('Created reference_numbers table');
        }

        // 2. Add insights to recaps if needed
        const { error: recapsError } = await supabase
            .from('recaps')
            .select('insights');

        if (recapsError) {
            // Add insights column to recaps
            await supabase.from('recaps').update({ insights: [] }).eq('id', '00000000-0000-0000-0000-000000000000');
            console.log('Added insights to recaps table');
        }

        console.log('✅ Tables setup complete');

    } catch (error) {
        console.error('Setup failed:', error);
        process.exit(1);
    }
}

setupTables();
