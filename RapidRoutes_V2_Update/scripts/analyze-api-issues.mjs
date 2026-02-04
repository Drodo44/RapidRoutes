// This script analyzes potential issues with the intelligence-pairing API
// It checks for common problems in the key files

import fs from 'fs';
import path from 'path';

// Files to analyze
const filesToCheck = [
  'pages/api/intelligence-pairing.js',
  'lib/geographicCrawl.js',
  'lib/post-options.js',
  'utils/supabaseClient.js',
  'utils/distance.js'
];

// Common issues to look for
const issues = {
  authTokenExtraction: 0,
  supabaseInitialization: 0,
  envVariables: 0,
  kmaValidation: 0,
  responseNormalization: 0
};

// Helper function to check file content
function analyzeFile(filePath, content) {
  console.log(`\n\x1b[1m🔍 Analyzing ${filePath}:\x1b[0m`);
  
  // Check for auth token extraction issues
  if (filePath.includes('intelligence-pairing.js')) {
    if (!content.includes('req.headers.authorization') && !content.includes('Authorization')) {
      console.log('\x1b[33m⚠️  Missing proper Authorization header extraction\x1b[0m');
      issues.authTokenExtraction++;
    }
    
    if (!content.includes('Bearer ')) {
      console.log('\x1b[33m⚠️  Missing Bearer token prefix check\x1b[0m');
      issues.authTokenExtraction++;
    }
    
    if (!content.includes('401') || !content.includes('Unauthorized')) {
      console.log('\x1b[33m⚠️  Missing proper 401 Unauthorized responses\x1b[0m');
      issues.authTokenExtraction++;
    }
  }
  
  // Check for Supabase initialization issues
  if (filePath.includes('supabaseClient.js')) {
    if (!content.includes('persistSession: false') || !content.includes('autoRefreshToken: false')) {
      console.log('\x1b[33m⚠️  Missing proper Supabase client initialization options\x1b[0m');
      issues.supabaseInitialization++;
    }
  }
  
  // Check for environment variable issues
  if (content.includes('process.env.')) {
    const envVarsInFile = content.match(/process\.env\.([A-Z_]+)/g) || [];
    console.log(`Found ${envVarsInFile.length} environment variable references`);
    
    // Check for key env vars
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_SERVICE_KEY',
      'HERE_API_KEY'
    ];
    
    const missingVars = [];
    requiredVars.forEach(v => {
      if (!envVarsInFile.some(e => e.includes(v))) {
        if (
          (v === 'SUPABASE_SERVICE_ROLE_KEY' && envVarsInFile.some(e => e.includes('SUPABASE_SERVICE_KEY'))) ||
          (v === 'SUPABASE_SERVICE_KEY' && envVarsInFile.some(e => e.includes('SUPABASE_SERVICE_ROLE_KEY')))
        ) {
          // This is ok, just using an alternative name
        } else {
          missingVars.push(v);
        }
      }
    });
    
    if (missingVars.length > 0) {
      console.log(`\x1b[33m⚠️  Missing environment variable references: ${missingVars.join(', ')}\x1b[0m`);
      issues.envVariables++;
    }
  }
  
  // Check for KMA validation
  if (filePath.includes('geographicCrawl.js')) {
    if (!content.includes('MIN_UNIQUE_KMAS') && !content.includes('minimum')) {
      console.log('\x1b[33m⚠️  Missing minimum unique KMAs validation\x1b[0m');
      issues.kmaValidation++;
    }
    
    if (!content.match(/\b5\b/) && !content.match(/\bfive\b/)) {
      console.log('\x1b[33m⚠️  May be missing the required minimum of 5 KMAs\x1b[0m');
      issues.kmaValidation++;
    }
    
    if (!content.match(/\b(100|75)\s*(miles|mi)/)) {
      console.log('\x1b[33m⚠️  May be missing proper mile radius limitations\x1b[0m');
      issues.kmaValidation++;
    }
  }
  
  // Check for response normalization
  if (filePath.includes('intelligence-pairing.js') || filePath.includes('post-options.js')) {
    const hasNormalization = content.includes('camelCase') || 
                             content.includes('snake_case') || 
                             (content.includes('originCity') && content.includes('origin_city'));
    
    if (!hasNormalization) {
      console.log('\x1b[33m⚠️  May be missing proper field name normalization between camelCase and snake_case\x1b[0m');
      issues.responseNormalization++;
    }
  }
}

// Main function to run the analysis
async function runAnalysis() {
  console.log('\x1b[1m🚀 Starting RapidRoutes Intelligence API Analysis\x1b[0m');
  
  for (const file of filesToCheck) {
    const filePath = path.join(process.cwd(), file);
    
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        analyzeFile(file, content);
      } else {
        console.log(`\n\x1b[31m❌ File not found: ${file}\x1b[0m`);
      }
    } catch (error) {
      console.log(`\n\x1b[31m❌ Error analyzing ${file}: ${error.message}\x1b[0m`);
    }
  }
  
  // Summary
  console.log('\n\x1b[1m📋 Analysis Summary:\x1b[0m');
  console.log(`- Auth Token Extraction Issues: ${issues.authTokenExtraction}`);
  console.log(`- Supabase Initialization Issues: ${issues.supabaseInitialization}`);
  console.log(`- Environment Variable Issues: ${issues.envVariables}`);
  console.log(`- KMA Validation Issues: ${issues.kmaValidation}`);
  console.log(`- Response Normalization Issues: ${issues.responseNormalization}`);
  
  const totalIssues = Object.values(issues).reduce((sum, val) => sum + val, 0);
  
  if (totalIssues === 0) {
    console.log('\n\x1b[32m✅ No issues detected! The code appears to be properly configured.\x1b[0m');
  } else {
    console.log(`\n\x1b[33m⚠️ Found ${totalIssues} potential issues that may need attention.\x1b[0m`);
  }
}

// Run the analysis
runAnalysis().catch(console.error);