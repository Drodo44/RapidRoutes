#!/usr/bin/env node

/**
 * RapidRoutes Post-Deployment Verification Script
 * 
 * Runs after each Vercel deployment to ensure production readiness.
 * Tests critical endpoints and logs results to deploy-history.json.
 * 
 * Exit codes:
 *   0 = All checks passed
 *   1 = One or more checks failed
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PRODUCTION_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}`
  : process.env.DEPLOYMENT_URL || 'https://rapid-routes.vercel.app';

const ADMIN_TOKEN = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TIMEOUT_MS = 10000;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

class DeploymentVerifier {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      commit: this.getCommitSHA(),
      url: PRODUCTION_URL,
      checks: [],
      passed: false,
      duration: 0
    };
    this.startTime = Date.now();
  }

  getCommitSHA() {
    try {
      return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    } catch {
      return process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'unknown';
    }
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  async checkHealthEndpoint() {
    this.log('\n🏥 Checking Health Endpoint...', 'cyan');
    const startTime = Date.now();
    
    try {
      const response = await this.fetchWithTimeout(`${PRODUCTION_URL}/api/health`);
      const duration = Date.now() - startTime;
      const data = await response.json();
      
      this.log(`   Status: ${response.status}`, response.status === 200 ? 'green' : 'red');
      this.log(`   Duration: ${duration}ms`, 'blue');
      
      // Validate response structure
      const checks = {
        statusCode: response.status === 200,
        envOk: data.env?.ok === true,
        tablesOk: data.tables?.every(t => t.ok === true),
        storageOk: data.storage?.ok === true,
        overallOk: data.ok === true
      };
      
      const allPassed = Object.values(checks).every(v => v === true);
      
      if (allPassed) {
        this.log('   ✅ Health check PASSED', 'green');
        this.log(`   - Environment: OK`, 'green');
        this.log(`   - Tables: ${data.tables?.length || 0} OK`, 'green');
        this.log(`   - Storage: OK`, 'green');
      } else {
        this.log('   ❌ Health check FAILED', 'red');
        if (!checks.statusCode) this.log('   - Status code: NOT 200', 'red');
        if (!checks.envOk) this.log('   - Environment: FAILED', 'red');
        if (!checks.tablesOk) this.log('   - Tables: SOME FAILED', 'red');
        if (!checks.storageOk) this.log('   - Storage: FAILED', 'red');
        this.log(`   - Response: ${JSON.stringify(data).substring(0, 200)}`, 'yellow');
      }
      
      this.results.checks.push({
        name: 'Health Check',
        endpoint: '/api/health',
        status: response.status,
        duration,
        passed: allPassed,
        details: checks,
        response: data
      });
      
      return allPassed;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`   ❌ ERROR: ${error.message}`, 'red');
      
      this.results.checks.push({
        name: 'Health Check',
        endpoint: '/api/health',
        status: 'error',
        duration,
        passed: false,
        error: error.message
      });
      
      return false;
    }
  }

  async checkEnvVariables() {
    this.log('\n🔐 Checking Environment Variables...', 'cyan');
    const startTime = Date.now();
    
    try {
      const response = await this.fetchWithTimeout(`${PRODUCTION_URL}/api/env-check`);
      const duration = Date.now() - startTime;
      const data = await response.json();
      
      this.log(`   Status: ${response.status}`, response.status === 200 ? 'green' : 'red');
      this.log(`   Duration: ${duration}ms`, 'blue');
      
      const requiredVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'NEXT_PUBLIC_HERE_API_KEY'
      ];
      
      const checks = {
        statusCode: response.status === 200,
        allVarsPresent: data.env && requiredVars.every(v => 
          data.env[v] === 'present' || data.env[v] === true
        )
      };
      
      const allPassed = Object.values(checks).every(v => v === true);
      
      if (allPassed) {
        this.log('   ✅ Environment variables PASSED', 'green');
        requiredVars.forEach(v => {
          this.log(`   - ${v}: present`, 'green');
        });
      } else {
        this.log('   ❌ Environment variables FAILED', 'red');
        if (data.env) {
          requiredVars.forEach(v => {
            const present = data.env[v] === 'present' || data.env[v] === true;
            this.log(`   - ${v}: ${present ? 'present' : 'MISSING'}`, present ? 'green' : 'red');
          });
        }
        this.log(`   - Response: ${JSON.stringify(data).substring(0, 200)}`, 'yellow');
      }
      
      this.results.checks.push({
        name: 'Environment Variables',
        endpoint: '/api/env-check',
        status: response.status,
        duration,
        passed: allPassed,
        details: checks,
        response: data
      });
      
      return allPassed;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`   ❌ ERROR: ${error.message}`, 'red');
      
      this.results.checks.push({
        name: 'Environment Variables',
        endpoint: '/api/env-check',
        status: 'error',
        duration,
        passed: false,
        error: error.message
      });
      
      return false;
    }
  }

  async checkAuthProfile() {
    this.log('\n👤 Checking Auth Profile Endpoint...', 'cyan');
    const startTime = Date.now();
    
    try {
      const response = await this.fetchWithTimeout(`${PRODUCTION_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      const duration = Date.now() - startTime;
      
      this.log(`   Status: ${response.status}`, response.status === 200 ? 'green' : 'yellow');
      this.log(`   Duration: ${duration}ms`, 'blue');
      
      // For auth endpoint, 401 is acceptable (means auth is working but no valid session)
      // 200 means we have a valid admin token
      const acceptableStatuses = [200, 401];
      const statusOk = acceptableStatuses.includes(response.status);
      
      let data;
      try {
        data = await response.json();
      } catch {
        data = { error: 'Could not parse response' };
      }
      
      const checks = {
        statusAcceptable: statusOk,
        noAdminClientError: !JSON.stringify(data).includes('SUPABASE_SERVICE_ROLE_KEY')
      };
      
      const allPassed = Object.values(checks).every(v => v === true);
      
      if (allPassed) {
        this.log('   ✅ Auth endpoint PASSED', 'green');
        if (response.status === 200) {
          this.log('   - Valid admin token detected', 'green');
        } else if (response.status === 401) {
          this.log('   - Endpoint secured (401 expected without valid session)', 'green');
        }
        this.log('   - No admin client errors detected', 'green');
      } else {
        this.log('   ❌ Auth endpoint FAILED', 'red');
        if (!checks.statusAcceptable) {
          this.log(`   - Unexpected status: ${response.status}`, 'red');
        }
        if (!checks.noAdminClientError) {
          this.log('   - Admin client error detected in response', 'red');
        }
        this.log(`   - Response: ${JSON.stringify(data).substring(0, 200)}`, 'yellow');
      }
      
      this.results.checks.push({
        name: 'Auth Profile',
        endpoint: '/api/auth/profile',
        status: response.status,
        duration,
        passed: allPassed,
        details: checks,
        response: data
      });
      
      return allPassed;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`   ❌ ERROR: ${error.message}`, 'red');
      
      this.results.checks.push({
        name: 'Auth Profile',
        endpoint: '/api/auth/profile',
        status: 'error',
        duration,
        passed: false,
        error: error.message
      });
      
      return false;
    }
  }

  async checkLanesEndpoint() {
    this.log('\n🛣️  Checking Lanes Endpoint...', 'cyan');
    const startTime = Date.now();
    
    try {
      const response = await this.fetchWithTimeout(`${PRODUCTION_URL}/api/lanes`);
      const duration = Date.now() - startTime;
      
      this.log(`   Status: ${response.status}`, response.status === 200 ? 'green' : 'yellow');
      this.log(`   Duration: ${duration}ms`, 'blue');
      
      // 401 is acceptable - means auth is working
      // 200 means endpoint is accessible (might be in testing mode)
      const acceptableStatuses = [200, 401];
      const statusOk = acceptableStatuses.includes(response.status);
      
      let data;
      try {
        data = await response.json();
      } catch {
        data = { error: 'Could not parse response' };
      }
      
      const checks = {
        statusAcceptable: statusOk,
        noAdminClientError: !JSON.stringify(data).includes('SUPABASE_SERVICE_ROLE_KEY'),
        responseValid: response.status === 200 ? Array.isArray(data) || data.error : true
      };
      
      const allPassed = Object.values(checks).every(v => v === true);
      
      if (allPassed) {
        this.log('   ✅ Lanes endpoint PASSED', 'green');
        if (response.status === 200) {
          const count = Array.isArray(data) ? data.length : 0;
          this.log(`   - Returned ${count} lanes`, 'green');
        } else if (response.status === 401) {
          this.log('   - Endpoint secured (401 expected without auth)', 'green');
        }
        this.log('   - No admin client errors detected', 'green');
      } else {
        this.log('   ❌ Lanes endpoint FAILED', 'red');
        if (!checks.statusAcceptable) {
          this.log(`   - Unexpected status: ${response.status}`, 'red');
        }
        if (!checks.noAdminClientError) {
          this.log('   - Admin client error detected in response', 'red');
        }
        if (!checks.responseValid) {
          this.log('   - Invalid response format', 'red');
        }
        this.log(`   - Response: ${JSON.stringify(data).substring(0, 200)}`, 'yellow');
      }
      
      this.results.checks.push({
        name: 'Lanes Endpoint',
        endpoint: '/api/lanes',
        status: response.status,
        duration,
        passed: allPassed,
        details: checks,
        response: response.status === 200 ? { count: Array.isArray(data) ? data.length : 'N/A' } : data
      });
      
      return allPassed;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`   ❌ ERROR: ${error.message}`, 'red');
      
      this.results.checks.push({
        name: 'Lanes Endpoint',
        endpoint: '/api/lanes',
        status: 'error',
        duration,
        passed: false,
        error: error.message
      });
      
      return false;
    }
  }

  async saveResults() {
    const logsDir = join(__dirname, 'logs');
    const historyFile = join(logsDir, 'deploy-history.json');
    
    // Create logs directory if it doesn't exist
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }
    
    // Load existing history
    let history = [];
    if (existsSync(historyFile)) {
      try {
        const content = readFileSync(historyFile, 'utf8');
        history = JSON.parse(content);
      } catch (error) {
        this.log(`\n⚠️  Could not read deploy history: ${error.message}`, 'yellow');
        history = [];
      }
    }
    
    // Add new result
    this.results.duration = Date.now() - this.startTime;
    history.push(this.results);
    
    // Keep only last 100 deployments
    if (history.length > 100) {
      history = history.slice(-100);
    }
    
    // Save updated history
    try {
      writeFileSync(historyFile, JSON.stringify(history, null, 2));
      this.log(`\n📝 Results saved to logs/deploy-history.json`, 'blue');
    } catch (error) {
      this.log(`\n⚠️  Could not save deploy history: ${error.message}`, 'yellow');
    }
  }

  async run() {
    this.log('\n═══════════════════════════════════════════════════════════════', 'cyan');
    this.log('🚀 RapidRoutes Post-Deployment Verification', 'cyan');
    this.log('═══════════════════════════════════════════════════════════════', 'cyan');
    this.log(`\n📍 URL: ${PRODUCTION_URL}`, 'blue');
    this.log(`📦 Commit: ${this.results.commit}`, 'blue');
    this.log(`⏰ Time: ${this.results.timestamp}`, 'blue');
    
    // Run all checks
    const healthPassed = await this.checkHealthEndpoint();
    const envPassed = await this.checkEnvVariables();
    const authPassed = await this.checkAuthProfile();
    const lanesPassed = await this.checkLanesEndpoint();
    
    // Determine overall result
    this.results.passed = healthPassed && envPassed && authPassed && lanesPassed;
    
    // Print summary
    this.log('\n═══════════════════════════════════════════════════════════════', 'cyan');
    this.log('📊 VERIFICATION SUMMARY', 'cyan');
    this.log('═══════════════════════════════════════════════════════════════', 'cyan');
    
    this.results.checks.forEach(check => {
      const icon = check.passed ? '✅' : '❌';
      const color = check.passed ? 'green' : 'red';
      this.log(`${icon} ${check.name.padEnd(25)} ${check.status} (${check.duration}ms)`, color);
    });
    
    this.log(`\n⏱️  Total Duration: ${this.results.duration}ms`, 'blue');
    
    // Save results
    await this.saveResults();
    
    // Final verdict
    if (this.results.passed) {
      this.log('\n✅ RapidRoutes post-deployment verification PASSED', 'green');
      this.log('   All systems operational. Production ready.', 'green');
      this.log('\n═══════════════════════════════════════════════════════════════\n', 'cyan');
      process.exit(0);
    } else {
      this.log('\n❌ RapidRoutes post-deployment verification FAILED', 'red');
      this.log('   Some checks did not pass. Review the details above.', 'red');
      this.log('\n═══════════════════════════════════════════════════════════════\n', 'cyan');
      process.exit(1);
    }
  }
}

// Run verification
const verifier = new DeploymentVerifier();
verifier.run().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
