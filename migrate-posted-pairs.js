/**
 * Database migration script to create posted_pairs table
 * Run this locally or add the SQL to Supabase dashboard
 */
import { createClient } from '@supabase/supabase-js';

const migrationSQL = `
-- Create posted_pairs table to track generated RR numbers for search functionality
CREATE TABLE IF NOT EXISTS posted_pairs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lane_id UUID REFERENCES lanes(id) ON DELETE CASCADE,
    reference_id VARCHAR(10) NOT NULL,
    origin_city VARCHAR(100) NOT NULL,
    origin_state VARCHAR(10) NOT NULL,
    dest_city VARCHAR(100) NOT NULL,
    dest_state VARCHAR(10) NOT NULL,
    posted_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posted_pairs_reference_id ON posted_pairs(reference_id);
CREATE INDEX IF NOT EXISTS idx_posted_pairs_lane_id ON posted_pairs(lane_id);
CREATE INDEX IF NOT EXISTS idx_posted_pairs_posted_at ON posted_pairs(posted_at);

-- Enable RLS
ALTER TABLE posted_pairs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own posted pairs
CREATE POLICY "Users can access their own posted pairs" ON posted_pairs
    FOR ALL USING (created_by = auth.uid());
`;

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Environment variables not set. Please run this migration through Supabase Dashboard:');
    console.log('\n📋 Copy and paste this SQL in your Supabase SQL Editor:\n');
    console.log(migrationSQL);
    console.log('\n🔗 Dashboard: https://app.supabase.com/project/[your-project]/sql');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    console.log('🚀 Running posted_pairs table migration...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: migrationSQL });
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('📋 Posted pairs table created with indexes and RLS policies');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📋 Please run manually in Supabase Dashboard:\n');
    console.log(migrationSQL);
  }
}

runMigration();
