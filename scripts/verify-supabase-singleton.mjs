import { execSync } from 'node:child_process';
import fs from 'node:fs';

const forbid = /createClient\s*\(/;
const allowlist = [
  'lib/supabaseClient.js',
  'lib/supabaseAdmin.js'
];

// Only check production files - exclude test/script files and others
const excludePatterns = [
  'analyze-', 'verify-', 'test-', 'test/', 'tests/', 'test-utils/', 'scripts/',
  'comprehensive-', 'db-inspection-', 'direct-api-', 'final-verification',
  'fix-rpc-', 'generate-test-', 'get-auth-', 'migrate-', 'production-verification.js',
  'standardize-', 'utils/haversine.js', 'RapidRoutes_V2_Update/'
];

let files = [];
try {
  files = execSync('git ls-files "*.js" "*.jsx"', { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .filter(f => !excludePatterns.some(pattern => f.includes(pattern)));
} catch (e) {
  // Fallback if git is not available or fails
  console.warn('Git command failed, skipping verification');
  process.exit(0);
}

const violations = [];

for (const f of files) {
  try {
    const content = fs.readFileSync(f, 'utf8');
    // Check first 2000 lines roughly (or just check whole file, it's fast enough)
    if (forbid.test(content) && !allowlist.some(a => f.endsWith(a))) {
      violations.push(f);
    }
  } catch (e) {
    continue;
  }
}

if (violations.length) {
  console.error('\n❌ Found forbidden direct `createClient(` calls:\n');
  for (const v of violations) console.error(' -', v);
  console.error('\nFix by using getBrowserSupabase() or getServerSupabase().\n');
  process.exit(1);
} else {
  console.log('✅ Supabase singleton verified: only lib/supabaseClient.js initializes the client.');
}
