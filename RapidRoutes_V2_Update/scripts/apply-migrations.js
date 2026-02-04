// scripts/apply-migrations.js
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://gwuhjxomavulwduhvgvi.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ';

async function applyMigrations() {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // 1. Create reference numbers table
        console.log('Creating reference_numbers table...');
        const { error: refError } = await supabase
            .from('reference_numbers')
            .insert({
                number: 'RR10000',
                status: 'active'
            })
            .select();

        if (refError) {
            // If table doesn't exist, create it
            const createTable = `
                CREATE TABLE IF NOT EXISTS reference_numbers (
                    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                    number VARCHAR(7) NOT NULL UNIQUE CHECK (number ~ '^RR\\d{5}$'),
                    lane_id UUID,
                    status VARCHAR(20) NOT NULL DEFAULT 'active',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
                );
            `;
            
            const { error: createError } = await supabase.rpc('exec_sql', { sql: createTable });
            if (createError) throw createError;
        }
        console.log('✅ Reference numbers table ready');

        // 2. Add columns to recaps table
        console.log('Enhancing recaps table...');
        const { data: recapsData, error: recapsError } = await supabase
            .from('recaps')
            .select('insights')
            .limit(1);

        if (recapsError && !recapsError.message.includes('column "insights" does not exist')) {
            const { error: alterError } = await supabase.rpc('add_column_if_not_exists', {
                table_name: 'recaps',
                column_name: 'insights',
                column_type: 'jsonb[]'
            });
            if (alterError) throw alterError;
        }
        console.log('✅ Recaps table enhanced');

        // 3. Verify the changes
        const { data: tables, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .in('table_name', ['reference_numbers', 'recaps']);

        if (tablesError) throw tablesError;

        console.log('Verified tables:', tables.map(t => t.table_name).join(', '));
        console.log('🎉 Migrations applied successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

applyMigrations();
