#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('Checking all profiles for organization_id...\n');

const { data: profiles, error } = await supabase
  .from('profiles')
  .select('id, email, team_name, role, organization_id')
  .order('email');

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log(`Total profiles: ${profiles.length}\n`);

const withOrg = profiles.filter(p => p.organization_id);
const withoutOrg = profiles.filter(p => !p.organization_id);

console.log(`✅ Profiles WITH organization_id: ${withOrg.length}`);
withOrg.forEach(p => {
  console.log(`  ${p.email} (${p.team_name || 'no team'}) - ${p.role} - org: ${p.organization_id}`);
});

console.log(`\n❌ Profiles WITHOUT organization_id: ${withoutOrg.length}`);
withoutOrg.forEach(p => {
  console.log(`  ${p.email} (${p.team_name || 'no team'}) - ${p.role}`);
});
