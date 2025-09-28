// extract-auth-token.js
// Simple script to extract the authentication token from localStorage
// Run this in your browser console while logged in to RapidRoutes

function extractAuthToken() {
  console.log('🔑 Searching for authentication tokens...');
  const tokens = [];
  
  // Check all localStorage keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    
    // Look for common auth token patterns
    if (key.includes('auth-token') || key.includes('supabase.auth')) {
      try {
        const value = localStorage.getItem(key);
        const data = JSON.parse(value);
        
        if (data && (data.access_token || (data.currentSession && data.currentSession.access_token))) {
          const token = data.access_token || data.currentSession.access_token;
          tokens.push({
            source: key,
            token: token,
            expiry: extractExpiry(token)
          });
        }
      } catch (e) {
        console.warn(`Error parsing ${key}:`, e);
      }
    }
  }
  
  // Check cookies as well
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    if (cookie.trim().startsWith('sb-auth-token=')) {
      try {
        const value = cookie.split('=')[1];
        const data = JSON.parse(decodeURIComponent(value));
        
        if (data && data.access_token) {
          tokens.push({
            source: 'cookie: sb-auth-token',
            token: data.access_token,
            expiry: extractExpiry(data.access_token)
          });
        }
      } catch (e) {
        console.warn('Error parsing auth cookie:', e);
      }
    }
  }
  
  // Display results
  if (tokens.length === 0) {
    console.log('❌ No authentication tokens found. Are you logged in?');
    return null;
  }
  
  console.log(`✅ Found ${tokens.length} token(s):`);
  tokens.forEach((item, index) => {
    console.log(`\n[Token ${index + 1}]`);
    console.log(`Source: ${item.source}`);
    console.log(`Token: ${item.token.substring(0, 20)}... (${item.token.length} chars)`);
    console.log(`Expiry: ${item.expiry || 'Unknown'}`);
  });
  
  console.log('\n📋 COPY THIS TOKEN:');
  console.log(tokens[0].token);
  
  return tokens[0].token;
}

// Helper to extract expiry from JWT
function extractExpiry(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    
    if (payload.exp) {
      const expiryDate = new Date(payload.exp * 1000);
      return expiryDate.toLocaleString();
    }
  } catch (e) {
    // Ignore errors
  }
  return null;
}

// Run immediately
extractAuthToken();