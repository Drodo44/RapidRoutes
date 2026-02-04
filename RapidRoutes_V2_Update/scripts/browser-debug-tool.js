/**
 * Browser Console Debug Tool for RapidRoutes Intelligence API
 * 
 * Copy and paste this entire file into your browser console when on the RapidRoutes
 * application to test the API with different parameter formats.
 * 
 * This will add a global DebugAPI object with methods for testing.
 */

// Create debug namespace
window.DebugAPI = {
  // Base URL detection - will use current origin
  baseUrl: window.location.origin,
  
  // Log with custom styling
  log: function(message, data = null) {
    console.log(
      `%c RapidRoutes Debug %c ${message} `, 
      'background: #333; color: #fff; padding: 2px 4px; border-radius: 3px 0 0 3px;', 
      'background: #007acc; color: #fff; padding: 2px 4px; border-radius: 0 3px 3px 0;',
      data || ''
    );
  },
  
  // Test the API with a specific format
  testApi: async function(format, customData = {}) {
    const baseData = {
      test_mode: true,
      originCity: 'Cincinnati',
      originState: 'OH',
      destinationCity: 'Chicago', 
      destinationState: 'IL',
      equipmentCode: 'V',
      ...customData
    };
    
    // Convert to the specified format if needed
    let requestData = baseData;
    
    if (format === 'snake_case') {
      requestData = {
        test_mode: true,
        origin_city: baseData.originCity,
        origin_state: baseData.originState,
        destination_city: baseData.destinationCity,
        destination_state: baseData.destinationState,
        equipment_code: baseData.equipmentCode,
        ...customData
      };
    } else if (format === 'dest_prefix') {
      requestData = {
        test_mode: true,
        origin_city: baseData.originCity,
        origin_state: baseData.originState,
        dest_city: baseData.destinationCity,
        dest_state: baseData.destinationState,
        equipment_code: baseData.equipmentCode,
        ...customData
      };
    } else if (format === 'direct_dest') {
      requestData = {
        test_mode: true,
        originCity: baseData.originCity,
        originState: baseData.originState,
        destCity: baseData.destinationCity,
        destState: baseData.destinationState,
        equipmentCode: baseData.equipmentCode,
        ...customData
      };
    }
    
    this.log(`Testing ${format} format`, requestData);
    
    try {
      // Regular API call
      const standardEndpoint = `${this.baseUrl}/api/intelligence-pairing`;
      this.log(`Calling: ${standardEndpoint}`);
      
      const response = await fetch(standardEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      this.log(`Status: ${response.status}`);
      
      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        responseData = await response.text();
      }
      
      this.log(`Response:`, responseData);
      return { status: response.status, data: responseData };
    } catch (error) {
      this.log(`Error:`, error);
      return { error: error.message };
    }
  },
  
  // Test debug endpoints
  testDebugEndpoint: async function(format = 'camelCase', customData = {}) {
    const baseData = {
      test_mode: true,
      originCity: 'Cincinnati',
      originState: 'OH',
      destinationCity: 'Chicago', 
      destinationState: 'IL',
      equipmentCode: 'V',
      ...customData
    };
    
    // Convert to the specified format if needed
    let requestData = baseData;
    
    if (format === 'snake_case') {
      requestData = {
        test_mode: true,
        origin_city: baseData.originCity,
        origin_state: baseData.originState,
        destination_city: baseData.destinationCity,
        destination_state: baseData.destinationState,
        equipment_code: baseData.equipmentCode,
        ...customData
      };
    } else if (format === 'dest_prefix') {
      requestData = {
        test_mode: true,
        origin_city: baseData.originCity,
        origin_state: baseData.originState,
        dest_city: baseData.destinationCity,
        dest_state: baseData.destinationState,
        equipment_code: baseData.equipmentCode,
        ...customData
      };
    } else if (format === 'direct_dest') {
      requestData = {
        test_mode: true,
        originCity: baseData.originCity,
        originState: baseData.originState,
        destCity: baseData.destinationCity,
        destState: baseData.destinationState,
        equipmentCode: baseData.equipmentCode,
        ...customData
      };
    }
    
    this.log(`Testing debug endpoint with ${format} format`, requestData);
    
    try {
      // Debug API call
      const debugEndpoint = `${this.baseUrl}/api/debug-intelligence-params`;
      this.log(`Calling: ${debugEndpoint}`);
      
      const response = await fetch(debugEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      this.log(`Status: ${response.status}`);
      
      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        responseData = await response.text();
      }
      
      this.log(`Response:`, responseData);
      return { status: response.status, data: responseData };
    } catch (error) {
      this.log(`Error:`, error);
      return { error: error.message };
    }
  },
  
  // Test all formats
  testAllFormats: async function() {
    this.log('Beginning tests of all parameter formats...');
    
    const results = {
      camelCase: await this.testApi('camelCase'),
      snake_case: await this.testApi('snake_case'),
      dest_prefix: await this.testApi('dest_prefix'),
      direct_dest: await this.testApi('direct_dest')
    };
    
    this.log('Test results summary:');
    for (const [format, result] of Object.entries(results)) {
      this.log(`${format}: ${result.status === 200 ? '✅ Success' : '❌ Failed'}`);
    }
    
    return results;
  },
  
  // Test all formats against debug endpoint
  testAllDebugFormats: async function() {
    this.log('Beginning tests of all parameter formats on debug endpoint...');
    
    const results = {
      camelCase: await this.testDebugEndpoint('camelCase'),
      snake_case: await this.testDebugEndpoint('snake_case'),
      dest_prefix: await this.testDebugEndpoint('dest_prefix'),
      direct_dest: await this.testDebugEndpoint('direct_dest')
    };
    
    this.log('Debug test results summary:');
    for (const [format, result] of Object.entries(results)) {
      this.log(`${format}: ${result.status === 200 ? '✅ Success' : '❌ Failed'}`);
    }
    
    return results;
  },
  
  // Monitor fetch calls
  monitorFetch: function() {
    const originalFetch = window.fetch;
    
    window.fetch = function(...args) {
      const [resource, config] = args;
      
      // Only monitor our API endpoints
      if (resource.includes('intelligence')) {
        DebugAPI.log(`Intercepted fetch to ${resource}`, config);
        
        if (config && config.body) {
          try {
            const body = JSON.parse(config.body);
            DebugAPI.log('Request body:', body);
          } catch (e) {
            DebugAPI.log('Request body (non-JSON):', config.body);
          }
        }
      }
      
      return originalFetch.apply(this, args)
        .then(response => {
          if (resource.includes('intelligence')) {
            DebugAPI.log(`Response from ${resource}:`, {
              status: response.status,
              statusText: response.statusText
            });
          }
          return response;
        })
        .catch(err => {
          if (resource.includes('intelligence')) {
            DebugAPI.log(`Error from ${resource}:`, err);
          }
          throw err;
        });
    };
    
    this.log('Fetch monitoring activated - all API calls to intelligence endpoints will be logged');
  }
};

// Display welcome message
DebugAPI.log('Debug tools initialized! Available commands:');
console.log(`
  DebugAPI.testApi('camelCase')     - Test API with camelCase format
  DebugAPI.testApi('snake_case')    - Test API with snake_case format
  DebugAPI.testApi('dest_prefix')   - Test API with dest_ prefix format
  DebugAPI.testApi('direct_dest')   - Test API with direct destCity/destState format
  DebugAPI.testAllFormats()         - Test all formats
  DebugAPI.testDebugEndpoint()      - Test the debug endpoint
  DebugAPI.testAllDebugFormats()    - Test all formats with debug endpoint
  DebugAPI.monitorFetch()           - Monitor all fetch calls to intelligence endpoints
`);