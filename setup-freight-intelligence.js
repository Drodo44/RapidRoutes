// Set up freight intelligence tables via Supabase REST API
import { adminSupabase } from './utils/supabaseClient.js';
import { readFileSync } from 'fs';

async function setupDatabase() {
    console.log('🔧 Setting up Freight Intelligence System');
    console.log('='.repeat(60));

    try {
        // Read the SQL file
        const sql = readFileSync('./create-freight-intelligence.sql', 'utf8');

        // Execute the SQL through Supabase
        const { data, error } = await adminSupabase.rpc('exec_sql', { sql_string: sql });

        if (error) throw error;

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
    }
}).catch(console.error);
