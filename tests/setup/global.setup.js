// tests/setup/global.setup.js

// Set up global environment variables
process.env.NODE_ENV = 'test'
process.env.HERE_API_KEY = 'test-api-key-for-here'
process.env.HERE_APP_ID = 'test-app-id'
process.env.HERE_APP_CODE = 'test-app-code'

// Export setup function
export async function setup() {
  // Any async setup that needs to be done before tests run
}

// Export teardown function
export async function teardown() {
  // Any cleanup that needs to be done after all tests complete
}
