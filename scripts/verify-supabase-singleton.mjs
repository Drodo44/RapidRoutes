import { execSync } from 'node:child_process';

const forbid = /createClient\s*\(/;
const allowlist = ['lib/supabaseClient.ts', 'lib/supabaseClient.js'];

const files = execSync('git ls-files "*.ts" "*.tsx" "*.js" "*.jsx"', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

let violations = [];

for (const f of files) {
  try {
    const content = execSync(`cat ${JSON.stringify(f)}`, { encoding: 'utf8' });
    if (forbid.test(content) && !allowlist.some(a => f.endsWith(a))) {
      violations.push(f);
    }
  } catch (e) {
    // Skip files that can't be read
    continue;
  }
}

if (violations.length) {
  console.error('\n❌ Found forbidden direct `createClient(` calls outside lib/supabaseClient.*:\n');
  for (const v of violations) console.error(' -', v);
  console.error('\nFix by importing getBrowserSupabase/getServerSupabase from lib/supabaseClient.\n');
  process.exit(1);
} else {
  console.log('✅ Supabase singleton verified: only lib/supabaseClient initializes the client.');
}
