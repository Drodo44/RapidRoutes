// Quick schema check
import { adminSupabase } from './utils/supabaseAdminClient.js';

(async () => {
  const { data, error } = await adminSupabase
    .from('dat_loads_2025')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error:', error);
  } else if (data && data[0]) {
    console.log('Available columns:');
    const cols = Object.keys(data[0]).sort();
    const kmaColumns = cols.filter(c => c.toLowerCase().includes('kma'));
    console.log('\nKMA-related columns:');
    console.log(kmaColumns.join('\n'));
    console.log('\nSample values:');
    kmaColumns.forEach(col => {
      console.log(`${col}: ${data[0][col]}`);
    });
  }
})();
