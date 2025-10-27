// pages/api/admin/setup-rpc.js
// One-time setup script to create the missing RPC function

import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'supabase', 'fetch_nearby_cities.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL - split by semicolon and execute each statement
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    
    const results = [];
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed) {
        try {
          const { data, error } = await supabase.rpc('exec_sql', { sql: trimmed });
          if (error) {
            console.log(`Failed to execute: ${trimmed.substring(0, 100)}...`);
            console.error('Error:', error);
            // Try direct execution for DDL statements
            const { data: directData, error: directError } = await supabase
              .from('dummy') // This will fail but let us execute raw SQL
              .select('*');
            
            // If that doesn't work, we'll use a different approach
          }
          results.push({ statement: trimmed.substring(0, 100) + '...', success: !error });
        } catch (e) {
          console.error('Exception executing statement:', e);
          results.push({ statement: trimmed.substring(0, 100) + '...', success: false, error: e.message });
        }
      }
    }

    // Test if the function was created
    const { data: testData, error: testError } = await supabase.rpc('fetch_nearby_cities', {
      i_lat: 33.0,
      i_lon: -86.9,
      i_radius_miles: 10,
      i_max: 5
    });

    res.status(200).json({
      message: 'Setup completed',
      results,
      functionTest: {
        success: !testError,
        error: testError?.message,
        resultCount: testData?.length || 0
      }
    });

  } catch (error) {
    console.error('Setup failed:', error);
    res.status(500).json({ error: error.message });
  }
}
