# Expanded Test Cases for Intelligence Pairing API

This document outlines additional test cases to thoroughly test the intelligence-pairing API's validation and fallback mechanisms.

## Advanced Test Cases

Beyond the basic tests in `test-intelligence-pairing.js`, consider these additional scenarios:

### 1. Recovery Mechanism Test

Create a test case with cities that might have insufficient KMAs in the initial query:

```javascript
{
  name: 'Recovery Mechanism Test',
  params: {
    origin_city: 'Albuquerque',
    origin_state: 'NM',
    dest_city: 'Eugene', 
    dest_state: 'OR'
  }
}
```

### 2. Invalid Cities Test

Test how the system handles invalid or non-existent cities:

```javascript
{
  name: 'Invalid Cities Test',
  params: {
    origin_city: 'NonexistentCity',
    origin_state: 'ZZ',
    dest_city: 'Atlanta', 
    dest_state: 'GA'
  }
}
```

### 3. Empty Response Test

Temporarily modify the API to return an empty array of pairs to test fallback:

```javascript
// In intelligence-pairing.js
// Add this near the beginning of the handler function for testing
if (req.query.test_empty === 'true') {
  return res.status(200).json({
    pairs: [],
    metadata: {
      dataSourceType: "database",
      totalCityPairs: 0,
      uniqueOriginKmas: 0,
      uniqueDestKmas: 0
    }
  });
}
```

Then call the API with:

```http
POST /api/intelligence-pairing?test_empty=true
{
  "origin_city": "Chicago",
  "origin_state": "IL",
  "dest_city": "Atlanta",
  "dest_state": "GA"
}
```

## Load Testing

For production readiness, consider running load tests:

```javascript
// Add to test-intelligence-pairing.js

async function runLoadTest(iterations = 10, concurrency = 3) {
  console.log(`\n======= Running Load Test (${iterations} iterations) =======`);
  const testCase = {
    name: 'Load Test',
    params: {
      origin_city: 'Chicago',
      origin_state: 'IL',
      dest_city: 'Atlanta', 
      dest_state: 'GA'
    }
  };
  
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;
  
  // Run tests in batches for controlled concurrency
  for (let i = 0; i < iterations; i += concurrency) {
    const batch = [];
    for (let j = 0; j < concurrency && (i + j) < iterations; j++) {
      batch.push(testIntelligencePairing(testCase)
        .then(() => { successCount++; })
        .catch(() => { failCount++; })
      );
    }
    await Promise.all(batch);
    console.log(`Progress: ${i + batch.length}/${iterations}`);
  }
  
  const duration = (Date.now() - startTime) / 1000;
  console.log(`\nLoad Test Results:`);
  console.log(`Total time: ${duration.toFixed(2)}s`);
  console.log(`Success: ${successCount}, Failed: ${failCount}`);
  console.log(`Average response time: ${(duration / iterations).toFixed(2)}s`);
}
```

## Error Recovery Testing

Test the system's ability to recover from database connection issues:

1. Create a test that temporarily breaks the database connection
2. Verify emergency fallback occurs with correct metadata
3. Restore the connection and verify normal operation resumes

## Monitoring Guide

When implementing these tests in production, monitor:

1. Frequency of emergency fallback usage
2. KMA diversity in generated pairs
3. Response times under various loads
4. Distribution of data source types in logs

This comprehensive testing approach ensures that the intelligence pairing system is robust and resilient against various failure modes.
