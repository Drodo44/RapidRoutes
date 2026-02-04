
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPrompts() {
  const { data, error } = await supabase
    .from('ai_prompts')
    .select('id, title, workflow_type');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Prompts:', data);
}

checkPrompts();
