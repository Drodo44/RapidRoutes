// run-migration.js - Execute SQL migration using Node.js
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Reading migration file...');
  
  try {
    const sql = fs.readFileSync('./fix-duplicate-reference-ids.sql', 'utf8');
    
    console.log('Executing migration...');
    
    // Execute the entire SQL as one query
    const { data, error } = await supabase
      .from('lanes')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Database connection test failed:', error);
      return;
    }
    
    console.log('Database connection verified, lanes table accessible');
    
    // Execute each statement individually using direct queries
    const statements = [
      // Update lanes with missing reference IDs
      `UPDATE lanes 
       SET reference_id = 'RR' || LPAD(CAST(id AS TEXT), 5, '0') 
       WHERE reference_id IS NULL OR reference_id = ''`,
       
      // Find and update duplicate reference IDs  
      `UPDATE lanes 
       SET reference_id = 'RR' || LPAD(CAST(id AS TEXT), 5, '0') 
       WHERE id IN (
         SELECT DISTINCT l1.id
         FROM lanes l1
         JOIN lanes l2 ON l1.reference_id = l2.reference_id AND l1.id != l2.id
       )`,
       
      // Add unique constraint if it doesn't exist
      `DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM pg_constraint 
           WHERE conname = 'lanes_reference_id_unique'
         ) THEN
           ALTER TABLE lanes ADD CONSTRAINT lanes_reference_id_unique UNIQUE (reference_id);
         END IF;
       END $$`
    ];
    
    for (let i = 0; i < statements.length; i++) {
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      try {
        const { error } = await supabase.rpc('exec', { sql: statements[i] });
        if (error) {
          console.error(`Error in statement ${i + 1}:`, error);
        } else {
          console.log(`Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.error(`Exception in statement ${i + 1}:`, err);
      }
    }
    
    console.log('Migration completed');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
