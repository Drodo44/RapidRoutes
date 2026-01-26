// scripts/run-migrations.js
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://gwuhjxomavulwduhvgvi.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

async function runMigrations() {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // First create the SQL executor function
    const executor = fs.readFileSync(
        path.join(process.cwd(), 'migrations', '005.5-create-sql-executor.sql'),
        'utf8'
    );

    // Execute directly using REST API
    const { data: executorData, error: executorError } = await supabase
        .from('_sql')
        .select('*')
        .execute(executor);

    if (executorError) {
        console.error('Failed to create SQL executor:', executorError);
        process.exit(1);
    }
    
    console.log('Running migrations...');

    try {
        // Read migration files
        const rr_system = fs.readFileSync(
            path.join(process.cwd(), 'migrations', '006-reference-number-system.sql'),
            'utf8'
        );
        
        const recap_system = fs.readFileSync(
            path.join(process.cwd(), 'migrations', '007-enhanced-recap-system.sql'),
            'utf8'
        );

        // Execute migrations
        console.log('Creating reference number system...');
        const { data: rrData, error: rrError } = await supabase.rpc('exec_sql', {
            sql: rr_system
        });

        if (rrError) throw rrError;
        console.log('✅ Reference number system created');

        console.log('Creating enhanced recap system...');
        const { data: recapData, error: recapError } = await supabase.rpc('exec_sql', {
            sql: recap_system
        });

        if (recapError) throw recapError;
        console.log('✅ Enhanced recap system created');

        console.log('🎉 Migrations completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigrations();
