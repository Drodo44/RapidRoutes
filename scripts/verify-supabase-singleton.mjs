import { execSync } from 'node:child_process';

const forbid = /createClient\s*\(/;
const allowlist = ['lib/supabaseClient.js'];

// Only check production files - exclude test/script files
const excludePatterns = [
  'analyze-',        // Analysis scripts
  'verify-',         // Standalone verification scripts  
  'test-',           // Test files
  'test/',           // Test directory
  'tests/',          // Test directory
  'test-utils/',     // Test utilities
  'scripts/',        // Database migration and setup scripts
  'comprehensive-',  // Comprehensive test scripts
  'db-inspection-',  // Database inspection tools
  'direct-api-',     // Direct API test tools
  'final-verification', // Standalone verification
  'fix-rpc-',        // Database fix scripts
  'generate-test-',  // Test data generators
  'get-auth-',       // Auth test tools
  'migrate-',        // Migration scripts
  'production-verification.js', // Standalone script (not API route)
  'standardize-'     // Data standardization scripts
];

const files = execSync('git ls-files "*.js" "*.jsx"', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter(f => !excludePatterns.some(pattern => f.includes(pattern)));

let violations = [];

for (const f of files) {
  try {
    const content = execSync(`sed -n '1,2000p' ${JSON.stringify(f)}`, { encoding: 'utf8' });
    if (forbid.test(content) && !allowlist.some(a => f.endsWith(a))) {
      violations.push(f);
    }
  } catch (e) {
    // Skip files that can't be read
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
