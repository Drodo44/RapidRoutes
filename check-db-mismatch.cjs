const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- Checking "Birmingham" ---');
    const { data: birm } = await supabase
        .from('cities')
        .select('city, state_or_province, kma_code, kma_name')
        .eq('city', 'Birmingham')
        .eq('state_or_province', 'AL')
        .single();
    console.log(birm);

    console.log('\n--- Checking "Fort Wayne" ---');
    // Note: User said "Ft Wayne". Database might use "Fort Wayne".
    const { data: fw } = await supabase
        .from('cities')
        .select('city, state_or_province, kma_code, kma_name')
        .ilike('city', '%Wayne%')
        .eq('state_or_province', 'IN')
        .limit(5);
    console.log(fw);
}

check();
