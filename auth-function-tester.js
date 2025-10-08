// auth-function-tester.js
// Run this in your browser's console when visiting /post-options

// This script tests the authentication functions to verify they're working properly

// Test authentication functions
async function testAuthenticationFunctions() {
  console.log('🔍 Testing authentication functions...');
  
  // Check if supabase is available
  if (typeof supabase === 'undefined') {
    console.error('❌ ERROR: supabase is not defined globally. Cannot test authentication functions.');
    return;
  }
  
  // Try to access the safeGetCurrentToken function
  try {
    // First check if the function exists in the global scope
    let safeGetCurrentToken;
    let safeGetTokenInfo;
    
    // Find any functions with similar names in the window object
    const possibleFunctions = Object.keys(window).filter(key => 
      typeof window[key] === 'function' && 
      (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth'))
    );
    
    if (possibleFunctions.length > 0) {
      console.log('Possible authentication functions found:', possibleFunctions);
    } else {
      console.log('No authentication functions found in global scope.');
    }
    
    // Try to find the functions in React component props
    console.log('Checking React components for authentication functions...');
    
    // Get React DevTools if available
    if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined') {
      console.log('React DevTools detected. You can inspect component props manually.');
    }
    
    // Test if we can get a session
    try {
      console.log('Attempting to get session from Supabase...');
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session retrieved:', !!session);
      
      if (session) {
        console.log('Authentication appears to be working.');
      } else {
        console.log('No active session found. User might not be logged in.');
      }
    } catch (e) {
      console.error('Error getting session:', e);
    }
    
    // Check for API calls that might use the token
    console.log('Looking for recent API calls in network tab...');
    console.log('Please check the Network tab for any calls to /api endpoints.');
    console.log('Verify that they include proper authorization headers.');
  } catch (e) {
    console.error('❌ ERROR testing authentication functions:', e);
  }
}

// Instructions for the user
console.log(`
📋 AUTHENTICATION FUNCTION TEST INSTRUCTIONS:
1. Make sure you're on the /post-options page and logged in
2. Open your browser console (F12 > Console tab)
3. Run the testAuthenticationFunctions() function
4. Review the results
5. Check for any error messages in the console

To run the test, type: testAuthenticationFunctions()
`);

// Make the function available globally
window.testAuthenticationFunctions = testAuthenticationFunctions;