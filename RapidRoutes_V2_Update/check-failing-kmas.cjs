const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- Checking Lexington, KY ---');
    const { data: lex } = await supabase
        .from('cities')
        .select('id, city, state_or_province, kma_code, kma_name')
        .eq('city', 'Lexington')
        .eq('state_or_province', 'KY')
        .single();
    console.log(lex);

    console.log('\n--- Checking Columbus, OH ---');
    const { data: col } = await supabase
        .from('cities')
        .select('id, city, state_or_province, kma_code, kma_name')
        .eq('city', 'Columbus')
        .eq('state_or_province', 'OH')
        .single();
    console.log(col);
    
    // Check if there are other cities named Lexington in KY
    const { data: lexOthers } = await supabase
        .from('cities')
        .select('id, city, state_or_province, kma_code, kma_name')
        .ilike('city', 'Lexington%')
        .eq('state_or_province', 'KY');
    if (lexOthers.length > 1) {
        console.log('\n--- Other Lexington matches in KY ---');
        console.log(lexOthers);
    }
}

check();
