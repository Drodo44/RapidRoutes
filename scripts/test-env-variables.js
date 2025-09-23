// scripts/test-env-variables.js
// Script to test environment variable configuration

const { spawn } = require('child_process');
const fetch = require('node-fetch');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
  },
  bg: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m',
  }
};

// Print a section header
function printHeader(title) {
  console.log('\n' + colors.fg.cyan + colors.bright + '='.repeat(80) + colors.reset);
  console.log(colors.fg.cyan + colors.bright + '  ' + title + colors.reset);
  console.log(colors.fg.cyan + colors.bright + '='.repeat(80) + colors.reset + '\n');
}

// Start a development server with specific environment variables
async function startDevServer(envVars = {}) {
  printHeader('Starting Development Server with Test Environment');
  
  // Combine default env variables with any provided ones
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    ALLOW_TEST_MODE: 'true',
    ENABLE_MOCK_AUTH: 'true',
    ...envVars
  };
  
  // Print the environment configuration
  console.log(colors.fg.yellow + 'Environment Configuration:' + colors.reset);
  Object.entries(env).forEach(([key, value]) => {
    if (key.startsWith('ALLOW_') || key.startsWith('ENABLE_') || key === 'NODE_ENV') {
      console.log(`  ${colors.fg.green}${key}${colors.reset} = ${colors.fg.white}${value}${colors.reset}`);
    }
  });
  
  console.log('\n' + colors.fg.yellow + 'Starting Next.js development server...' + colors.reset);
  
  // Start Next.js in development mode with the environment variables
  const nextDev = spawn('npx', ['next', 'dev'], {
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  // Wait for server to start
  return new Promise((resolve, reject) => {
    let serverStarted = false;
    
    // Handle server output
    nextDev.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(colors.dim + output + colors.reset);
      
      // Detect when server is ready
      if (output.includes('ready') && output.includes('started')) {
        serverStarted = true;
        setTimeout(() => {
          console.log(colors.fg.green + 'Server started successfully!' + colors.reset);
          resolve(nextDev);
        }, 1000); // Give it a moment to fully initialize
      }
    });
    
    // Handle server errors
    nextDev.stderr.on('data', (data) => {
      console.error(colors.fg.red + data.toString() + colors.reset);
    });
    
    // Handle server exit
    nextDev.on('close', (code) => {
      if (!serverStarted) {
        reject(new Error(`Server process exited with code ${code} before starting`));
      }
    });
    
    // Set a timeout in case the server never starts
    setTimeout(() => {
      if (!serverStarted) {
        nextDev.kill();
        reject(new Error('Timeout waiting for server to start'));
      }
    }, 30000);
  });
}

// Test the debug endpoint
async function testDebugEndpoint() {
  printHeader('Testing Debug Environment Endpoint');
  
  try {
    const response = await fetch('http://localhost:3000/api/debug/environment', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Env': 'true'
      }
    });
    
    const data = await response.json();
    
    console.log(colors.fg.green + 'Debug endpoint response:' + colors.reset);
    console.log(JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error(colors.fg.red + 'Error testing debug endpoint:' + colors.reset, error.message);
    throw error;
  }
}

// Test the intelligence pairing endpoint with test mode
async function testIntelligencePairingEndpoint() {
  printHeader('Testing Intelligence Pairing Endpoint with Test Mode');
  
  try {
    const response = await fetch('http://localhost:3000/api/intelligence-pairing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Env': 'true'
      },
      body: JSON.stringify({
        origin_city: 'Cincinnati',
        origin_state: 'OH',
        destination_city: 'Chicago',
        destination_state: 'IL',
        equipment_code: 'V',
        test_mode: true,
        mock_auth: true,
        debug_env: true
      })
    });
    
    const data = await response.json();
    
    console.log(colors.fg.green + 'Intelligence pairing response:' + colors.reset);
    console.log(JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error(colors.fg.red + 'Error testing intelligence pairing:' + colors.reset, error.message);
    throw error;
  }
}

// Run the tests
async function runTests() {
  let server;
  
  try {
    // Start the server
    server = await startDevServer();
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test the debug endpoint
    await testDebugEndpoint();
    
    // Test the intelligence pairing endpoint
    await testIntelligencePairingEndpoint();
    
    printHeader('All Tests Completed Successfully');
  } catch (error) {
    console.error(colors.fg.red + 'Test Failed:' + colors.reset, error.message);
  } finally {
    // Cleanup
    if (server) {
      console.log(colors.fg.yellow + 'Shutting down server...' + colors.reset);
      server.kill();
    }
  }
}

// Run the tests
runTests();