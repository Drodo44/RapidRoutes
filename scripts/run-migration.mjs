#!/usr/bin/env node
// Run database migration for city_performance table

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

// Read SQL file
const sqlPath = join(__dirname, '../sql/create-city-performance.sql');
const sql = readFileSync(sqlPath, 'utf-8');

// Use direct SQL execution via Supabase REST API
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🚀 Starting database migration...\n');

// Execute SQL via Supabase REST API
async function executeMigration() {
  try {
    // Import adminSupabase for server-side operations
    const { getServerSupabase } = await import('../utils/supabaseClient.js');
    const supabase = getServerSupabase();
    
    console.log('📝 Executing SQL migration...');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`   Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement using RPC if available, or raw SQL
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 60).replace(/\n/g, ' ') + '...';
      
      try {
        // Use raw SQL execution via supabase-js
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
        
        if (error) {
          // If RPC doesn't exist, try direct table operations for CREATE TABLE
          if (statement.toUpperCase().includes('CREATE TABLE IF NOT EXISTS city_performance')) {
            console.log(`   ⚠️  RPC not available, creating table via Supabase dashboard is recommended`);
            console.log(`   Statement: ${preview}`);
            errorCount++;
          } else {
            console.log(`   ⚠️  Warning on: ${preview}`);
            console.log(`      ${error.message}`);
            errorCount++;
          }
        } else {
          console.log(`   ✅ ${i + 1}/${statements.length}: ${preview}`);
          successCount++;
        }
      } catch (err) {
        console.log(`   ⚠️  Error on: ${preview}`);
        console.log(`      ${err.message}`);
        errorCount++;
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⚠️  Warnings: ${errorCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (errorCount > 0) {
      console.log('⚠️  ALTERNATIVE MIGRATION METHOD REQUIRED\n');
      console.log('Since psql is not available and RPC may not be configured,');
      console.log('please execute the migration manually via Supabase Dashboard:\n');
      console.log('1. Go to: https://supabase.com/dashboard');
      console.log('2. Select your project');
      console.log('3. Click "SQL Editor" in left menu');
      console.log('4. Paste contents of: sql/create-city-performance.sql');
      console.log('5. Click "Run" button\n');
      console.log('Or use the Supabase CLI:');
      console.log('   supabase db push\n');
    } else {
      console.log('✅ Migration completed successfully!');
      console.log('   Run: npm run check:prod');
      console.log('   Expected: 10/10 tests passing (100%)\n');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n📝 Manual Migration Required:');
    console.error('   1. Open Supabase Dashboard SQL Editor');
    console.error('   2. Run: sql/create-city-performance.sql');
    console.error('   3. Verify with: npm run check:prod\n');
    process.exit(1);
  }
}

executeMigration();
