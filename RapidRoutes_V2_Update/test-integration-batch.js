#!/usr/bin/env node
/**
 * Integration Batch Test for /api/intelligence-pairing
 * Usage: node test-integration-batch.js [--debug] [--host=http://localhost:3000]
 *
 * Features:
 *  - Sends multiple lane POST requests to the pairing engine
 *  - Classifies each outcome: success | error | skipped
 *  - Prints per-lane log + final summary
 *  - --debug flag adds PAIRING_DEBUG header and prints raw request/response
 */

import { spawn } from 'child_process';
import { setTimeout as wait } from 'timers/promises';
import fs from 'fs';
import path from 'path';

const DEFAULT_HOST = 'http://localhost:3000';
const SERVER_START_TIMEOUT_MS = 60_000; // 60s max wait
const SERVER_POLL_INTERVAL_MS = 1_000;  // poll every second

let serverProcess = null;

function upsertKey(lines, key, value) {
  const idx = lines.findIndex(l => l.startsWith(key + '='));
  if (idx === -1) lines.push(`${key}=${value}`); else lines[idx] = `${key}=${value}`;
}

function ensureEnvFile() {
  const projectRoot = process.cwd();
  const envLocalPath = path.join(projectRoot, '.env.local');
  const envExamplePath = path.join(projectRoot, '.env.example');

  if (!fs.existsSync(envExamplePath)) {
    console.error('❌ .env.example not found. Cannot auto-provision real values.');
    process.exit(1);
  }

  // Parse .env.example
  const exampleContent = fs.readFileSync(envExamplePath, 'utf8');
  const exampleVars = {};
  exampleContent.split(/\r?\n/).forEach(line => {
    if (!line || line.trim().startsWith('#')) return;
    const idx = line.indexOf('=');
    if (idx === -1) return;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    if (k) exampleVars[k] = v;
  });

  const required = ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','HERE_API_KEY'];
  const missingInExample = required.filter(k => !(k in exampleVars));
  if (missingInExample.length) {
    console.error(`❌ Missing required keys in .env.example: ${missingInExample.join(', ')}`);
    process.exit(1);
  }

  // Load existing .env.local if present
  let localMap = {};
  if (fs.existsSync(envLocalPath)) {
    const localContent = fs.readFileSync(envLocalPath, 'utf8');
    localContent.split(/\r?\n/).forEach(line => {
      if (!line || line.trim().startsWith('#')) return;
      const idx = line.indexOf('=');
      if (idx === -1) return;
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      if (k) localMap[k] = v;
    });
  }

  // Decide final values: prefer existing non-placeholder local, else use example
  const isPlaceholder = v => !v || /PLACEHOLDER/i.test(v) || v === 'replace_me' || v.includes('placeholder.supabase.co');
  const finalVars = {};
  required.forEach(k => {
    const localVal = localMap[k];
    if (localVal && !isPlaceholder(localVal)) {
      finalVars[k] = localVal; // keep existing real value
    } else {
      finalVars[k] = exampleVars[k];
    }
  });

  // Write merged vars back (keeping any other existing lines not in required)
  const merged = { ...localMap, ...finalVars };
  const lines = Object.entries(merged).map(([k,v]) => `${k}=${v}`);
  fs.writeFileSync(envLocalPath, lines.join('\n') + '\n', 'utf8');
  console.log('🧪 Provisioned .env.local from .env.example (preserved existing real values)');

  // Export into process.env for current run
  required.forEach(k => { process.env[k] = merged[k]; });

  // Mask & log
  const mask = v => (!v ? '(empty)' : (v.length <= 12 ? v : v.slice(0,6) + '…' + v.slice(-4)));
  console.log('🔐 Effective env values (masked):');
  required.forEach(k => console.log(`  ${k} = ${mask(merged[k])}`));
}

function validateCriticalEnv() {
  const required = [
    'HERE_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  const envLocalPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envLocalPath)) {
    console.error('❌ .env.local is missing. Please create it with required keys before running the harness.');
    process.exit(1);
  }
  const content = fs.readFileSync(envLocalPath, 'utf8');
  const map = {};
  content.split(/\r?\n/).forEach(line => {
    if (!line || line.trim().startsWith('#')) return;
    const idx = line.indexOf('=');
    if (idx === -1) return;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    if (k) map[k] = v;
  });
  const missing = [];
  const placeholder = [];
  const isPlaceholder = (val) => !val || val === '' || /PLACEHOLDER/i.test(val) || val.includes('placeholder.supabase.co');
  required.forEach(key => {
    if (!(key in map)) missing.push(key); else if (isPlaceholder(map[key])) placeholder.push(key);
  });
  // Mask & print values for operator confirmation
  console.log('🔐 Environment variable preview (masked):');
  const mask = v => (!v ? '(empty)' : (v.length > 20 ? v.slice(0,20) + '…' : v));
  required.forEach(key => {
    const val = map[key];
    console.log(`  ${key} = ${mask(val)}`);
  });
  if (missing.length || placeholder.length) {
    if (missing.length) console.error(`❌ Missing required env vars: ${missing.join(', ')}`);
    if (placeholder.length) console.error(`❌ Placeholder/empty values for: ${placeholder.join(', ')}`);
    console.error('Aborting before starting dev server. Populate .env.local with real values and re-run.');
    process.exit(1);
  }
  console.log('✅ All critical environment variables present and non-placeholder.');
}

async function waitForServer(host, timeoutMs, intervalMs) {
  const end = Date.now() + timeoutMs;
  const base = host.replace(/\/$/, '');
  const pairingEndpoint = `${base}/api/intelligence-pairing`;
  while (Date.now() < end) {
    try {
      // Basic root fetch
      const rootResp = await fetch(base, { method: 'GET' });
      // Probe pairing endpoint expecting 200 (ready) or 400 (validation error due to empty body) as success signals
      const probeResp = await fetch(pairingEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      if (rootResp.ok && (probeResp.status === 200 || probeResp.status === 400)) {
        return true;
      }
    } catch (_) {
      // Ignore until timeout
    }
    await wait(intervalMs);
  }
  return false;
}

function startDevServer() {
  console.log('🟢 Starting Next.js dev server (npm run dev)...');
  const proc = spawn('npm', ['run', 'dev'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
    shell: false
  });
  let buildFailed = false;
  const detectBuildIssue = (line) => {
    const lower = line.toLowerCase();
    if (lower.includes('failed to compile') || lower.includes('error - ') || lower.includes('uncaught') || lower.includes('webpack compilation error')) {
      buildFailed = true;
      console.error('❌ Build error detected. Will abort readiness if not resolved.');
    }
  };
  proc.stdout.on('data', d => {
    const line = d.toString();
    detectBuildIssue(line);
    process.stdout.write(line);
  });
  proc.stderr.on('data', d => {
    const line = d.toString();
    detectBuildIssue(line);
    process.stderr.write(line);
  });
  proc.on('exit', (code, sig) => {
    console.error(`🔻 Dev server exited (code=${code}, signal=${sig})`);
    if (!global.__SERVER_READY__) {
      console.error('❌ Dev server exited before readiness confirmation. Failing fast.');
      process.exitCode = 1;
    }
  });
  return { proc, getBuildFailed: () => buildFailed };
}

async function shutdownServer() {
  if (!serverProcess) return;
  console.log('🛑 Shutting down dev server...');
  return new Promise(resolve => {
    serverProcess.once('exit', () => resolve());
    serverProcess.kill('SIGINT');
    // Fallback kill after timeout
    setTimeout(() => {
      if (!serverProcess.killed) {
        console.log('⚠️ Forcing dev server kill (SIGKILL)');
        serverProcess.kill('SIGKILL');
      }
    }, 5_000);
  });
}

// Hardcoded test lanes (IDs are synthetic for logging context)
const testLanes = [
  { id: 'L1', origin_city: 'Augusta', origin_state: 'GA', dest_city: 'Stephenson', dest_state: 'VA' },
  { id: 'L2', origin_city: 'Fitzgerald', origin_state: 'GA', dest_city: 'Winter Haven', dest_state: 'FL' },
  { id: 'L3', origin_city: 'Riegelwood', origin_state: 'NC', dest_city: 'Altamont', dest_state: 'NY' },
  // Optional extra lanes can be appended here for broader coverage
];

function parseArgs(argv) {
  const flags = { debug: false, host: DEFAULT_HOST };
  argv.slice(2).forEach(arg => {
    if (arg === '--debug') flags.debug = true;
    else if (arg.startsWith('--host=')) flags.host = arg.split('=')[1];
  });
  return flags;
}

async function postLane(host, lane, debug) {
  const url = `${host.replace(/\/$/, '')}/api/intelligence-pairing`;
  const body = {
    origin_city: lane.origin_city,
    origin_state: lane.origin_state,
    dest_city: lane.dest_city,
    dest_state: lane.dest_state
  };

  const headers = { 'Content-Type': 'application/json' };
  if (debug) headers['PAIRING_DEBUG'] = '1'; // Header (engine uses env var, but included for traceability)

  const started = Date.now();
  let response, json;
  try {
    if (debug) console.log('\n🐞 REQUEST', { url, body, headers });
    response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    const text = await response.text();
    try { json = text ? JSON.parse(text) : {}; } catch { json = { parseError: true, raw: text }; }
    if (debug) console.log('🐞 RESPONSE', { status: response.status, json });
  } catch (networkErr) {
    return {
      laneId: lane.id,
      classification: 'error',
      timeMs: Date.now() - started,
      pairs: [],
      error: `NETWORK_ERROR: ${networkErr.message}`
    };
  }

  const pairs = Array.isArray(json.pairs) ? json.pairs : [];
  const classification = json.error
    ? 'error'
    : (pairs.length > 0 ? 'success' : 'skipped');

  return {
    laneId: lane.id,
    classification,
    timeMs: Date.now() - started,
    pairs,
    error: json.error || null,
    raw: json
  };
}

async function main() {
  const { debug, host } = parseArgs(process.argv);
  console.log(`🚀 Starting integration batch test (host=${host}, debug=${debug})`);

  // Start dev server automatically unless host overridden to non-default
  const useLocalServer = host === DEFAULT_HOST;
  if (useLocalServer) {
    ensureEnvFile();
    validateCriticalEnv();
    const { proc, getBuildFailed } = startDevServer();
    serverProcess = proc;
    const ready = await waitForServer(host, SERVER_START_TIMEOUT_MS, SERVER_POLL_INTERVAL_MS);
    if (!ready || getBuildFailed()) {
      console.error(`❌ Dev server readiness check failed ${getBuildFailed() ? '(build error detected)' : ''} within ${SERVER_START_TIMEOUT_MS}ms`);
      await shutdownServer();
      process.exit(1);
    }
    global.__SERVER_READY__ = true;
    console.log('✅ Dev server & pairing API endpoint are reachable. Beginning tests...');
  } else {
    console.log('🌐 Using provided host (no local dev server start)');
  }

  const start = Date.now();
  let successCount = 0, skipCount = 0, errorCount = 0;
  const results = [];

  for (const lane of testLanes) {
    const result = await postLane(host, lane, debug);
    results.push(result);
    if (result.classification === 'success') successCount++; else if (result.classification === 'error') errorCount++; else skipCount++;
    console.log(`[BATCH] Lane ${result.laneId} outcome: ${result.classification} (pairs=${result.pairs.length}${result.error ? ', error=' + result.error : ''})`);
  }

  const totalTime = Date.now() - start;
  const avg = Math.round(totalTime / results.length);
  console.log(`\n✨ Batch processing complete: ${successCount} success, ${skipCount} skipped, ${errorCount} errors in ${totalTime}ms (avg: ${avg}ms/lane)`);

  // Provide condensed summary object when run with --debug for potential machine parsing
  if (debug) {
    console.log('\n🐞 SUMMARY OBJECT');
    console.log(JSON.stringify({ successCount, skipCount, errorCount, totalTime, avg }, null, 2));
  }

  // Exit code: 0 even if errors (test harness), but could be changed to errorCount>0 ? 1 : 0
  // Always attempt graceful shutdown
  if (serverProcess) {
    await shutdownServer();
  }

  process.exit(0);
}

// Node 18+ has global fetch; verify otherwise require('node-fetch') fallback
if (typeof fetch !== 'function') {
  console.error('fetch is not available in this Node runtime. Install node-fetch if needed.');
  process.exit(1);
}

// Ensure graceful shutdown on unhandled errors
main().catch(async (err) => {
  console.error('💥 Unhandled error during integration batch:', err);
  await shutdownServer();
  process.exit(1);
});

// Signal handlers for manual interrupts
['SIGINT','SIGTERM'].forEach(sig => {
  process.on(sig, async () => {
    console.log(`\n⚠️ Received ${sig} – cleaning up dev server...`);
    await shutdownServer();
    process.exit(130);
  });
});
