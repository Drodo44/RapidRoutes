// scripts/debug-frontend-calls.js
// This script is designed to be added to the frontend code to log API calls

// Function to intercept fetch calls and log the details
function interceptFetch() {
  const originalFetch = window.fetch;
  
  window.fetch = async function(url, options) {
    // Only intercept calls to our intelligence API
    if (url.includes('intelligence-pairing')) {
      console.log('🔍 INTERCEPTED API CALL:');
      console.log('📝 URL:', url);
      console.log('📝 Method:', options?.method || 'GET');
      console.log('📝 Headers:', options?.headers || {});
      
      if (options?.body) {
        try {
          const body = JSON.parse(options.body);
          console.log('📝 Body:', body);
          
          // Check for common issues
          checkRequiredFields(body);
        } catch (e) {
          console.log('📝 Body (raw):', options.body);
        }
      }
    }
    
    // Call the original fetch
    return originalFetch.apply(this, arguments);
  };
  
  console.log('🔒 Fetch interceptor installed');
}

// Function to check for required fields
function checkRequiredFields(body) {
  const requiredFields = [
    { name: 'originCity', alternates: ['origin_city'] },
    { name: 'originState', alternates: ['origin_state'] },
    { name: 'destinationCity', alternates: ['destination_city', 'dest_city'] },
    { name: 'destinationState', alternates: ['destination_state', 'dest_state'] },
    { name: 'equipmentCode', alternates: ['equipment_code'] }
  ];
  
  const missingFields = [];
  
  for (const field of requiredFields) {
    // Check main field name and alternates
    const hasValue = field.name in body || field.alternates.some(alt => alt in body);
    if (!hasValue) {
      missingFields.push(`${field.name} (or ${field.alternates.join(' or ')})`);
    }
  }
  
  if (missingFields.length > 0) {
    console.warn('⚠️ MISSING REQUIRED FIELDS:', missingFields.join(', '));
  } else {
    console.log('✅ All required fields present');
  }
}

// Install the interceptor
interceptFetch();
console.log('🚀 Debug frontend call interceptor installed');

// Add a test button to trigger a fake API call
function addTestButton() {
  const button = document.createElement('button');
  button.textContent = 'Test Intelligence API';
  button.style.position = 'fixed';
  button.style.top = '10px';
  button.style.right = '10px';
  button.style.zIndex = '9999';
  button.style.padding = '8px 16px';
  button.style.backgroundColor = '#4CAF50';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.cursor = 'pointer';
  
  button.onclick = async () => {
    console.log('🧪 Testing API call...');
    
    try {
      const response = await fetch('/api/intelligence-pairing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          originCity: 'Chicago',
          originState: 'IL',
          destinationCity: 'Atlanta',
          destinationState: 'GA',
          equipmentCode: 'V',
          test_mode: true
        })
      });
      
      console.log(`📥 Response: ${response.status} ${response.statusText}`);
      
      try {
        const data = await response.json();
        console.log('📄 Response data:', data);
      } catch (e) {
        console.log('⚠️ Could not parse response JSON:', e.message);
      }
    } catch (e) {
      console.error('❌ Error:', e.message);
    }
  };
  
  document.body.appendChild(button);
}

// Add the test button when the DOM is ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(addTestButton, 1000);
} else {
  document.addEventListener('DOMContentLoaded', () => setTimeout(addTestButton, 1000));
}

// Log that the script has loaded
console.log('🔧 Debug frontend calls script loaded');