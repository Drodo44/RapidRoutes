const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- Checking Bloomington, IL ---');
    const { data: il } = await supabase
        .from('cities')
        .select('*')
        .eq('city', 'Bloomington')
        .eq('state_or_province', 'IL')
        .single();
    console.log(il);

    console.log('\n--- Checking Detroit, MI ---');
    const { data: mi } = await supabase
        .from('cities')
        .select('*')
        .eq('city', 'Detroit')
        .eq('state_or_province', 'MI')
        .single();
    console.log(mi);
}

check();
