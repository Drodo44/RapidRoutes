#!/bin/bash
# Simplified test script for API validation

echo -e "\n\033[1;36m=== Testing Partial Destination Validation Changes ===\033[0m\n"

# Check if the server is running
if ! curl -s http://localhost:3000 > /dev/null; then
  echo -e "\033[0;31mERROR: Server not running. Please start your Next.js server with 'npm run dev' first.\033[0m"
  exit 1
fi

echo -e "\033[0;34mStarting API tests...\033[0m"

# Test 1: Complete destination data (should pass)
echo -e "\n\033[0;33m1. Testing lane with COMPLETE destination data (should pass)\033[0m"
curl -s -X POST http://localhost:3000/api/lanes \
  -H "Content-Type: application/json" \
  -H "X-Test-Auth-Bypass: true" \
  -d '{
    "origin_city": "Columbus", 
    "origin_state": "OH", 
    "dest_city": "Chicago", 
    "dest_state": "IL", 
    "equipment_code": "V", 
    "weight_lbs": 40000, 
    "pickup_earliest": "'$(date -I)'T12:00:00Z"
  }'

# Test 2: City only (should pass)
echo -e "\n\n\033[0;33m2. Testing lane with ONLY destination city (should pass)\033[0m"
curl -s -X POST http://localhost:3000/api/lanes \
  -H "Content-Type: application/json" \
  -H "X-Test-Auth-Bypass: true" \
  -d '{
    "origin_city": "Columbus", 
    "origin_state": "OH", 
    "dest_city": "Chicago", 
    "dest_state": "", 
    "equipment_code": "V", 
    "weight_lbs": 40000, 
    "pickup_earliest": "'$(date -I)'T12:00:00Z"
  }'

# Test 3: State only (should pass)
echo -e "\n\n\033[0;33m3. Testing lane with ONLY destination state (should pass)\033[0m"
curl -s -X POST http://localhost:3000/api/lanes \
  -H "Content-Type: application/json" \
  -H "X-Test-Auth-Bypass: true" \
  -d '{
    "origin_city": "Columbus", 
    "origin_state": "OH", 
    "dest_city": "", 
    "dest_state": "IL", 
    "equipment_code": "V", 
    "weight_lbs": 40000, 
    "pickup_earliest": "'$(date -I)'T12:00:00Z"
  }'

# Test 4: No destination data (should fail)
echo -e "\n\n\033[0;33m4. Testing lane with NO destination data (should fail)\033[0m"
curl -s -X POST http://localhost:3000/api/lanes \
  -H "Content-Type: application/json" \
  -H "X-Test-Auth-Bypass: true" \
  -d '{
    "origin_city": "Columbus", 
    "origin_state": "OH", 
    "dest_city": "", 
    "dest_state": "", 
    "equipment_code": "V", 
    "weight_lbs": 40000, 
    "pickup_earliest": "'$(date -I)'T12:00:00Z"
  }'

echo -e "\n\n\033[0;34mTests complete!\033[0m"
echo -e "\033[0;32mVerify in the output above:\033[0m"
echo -e "- Tests 1-3 should show successful lane creation (status 201)"
echo -e "- Test 4 should show validation failure (status 400)"