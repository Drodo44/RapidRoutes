// Create tables directly via SQL
import { adminSupabase } from './utils/supabaseClient.js';
import { readFileSync } from 'fs';

async function setupDatabase() {
    console.log('🔧 Setting up Freight Intelligence System');
    console.log('='.repeat(60));

    try {
        // Read and split the SQL file into individual statements
        const sql = readFileSync('./create-freight-intelligence.sql', 'utf8');
        const statements = sql.split(';').filter(stmt => stmt.trim());

        // Execute each statement
        for (const statement of statements) {
            const { error } = await adminSupabase.rpc('run_sql', {
                query: statement.trim()
            });

            if (error) {
                console.warn('Statement warning (continuing):', error.message);
            }
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
