#!/bin/bash
# Simple script to test the API validation changes

echo -e "\n\033[1;36m=== Testing Partial Destination Validation Changes ===\033[0m\n"

# Function to display colored messages
print_colored() {
  case $1 in
    "green") echo -e "\033[0;32m$2\033[0m" ;;
    "red") echo -e "\033[0;31m$2\033[0m" ;;
    "yellow") echo -e "\033[0;33m$2\033[0m" ;;
    "blue") echo -e "\033[0;34m$2\033[0m" ;;
    *) echo "$2" ;;
  esac
}

# Check if the server is running
if ! curl -s http://localhost:3000 > /dev/null; then
  print_colored "red" "ERROR: Server not running. Please start your Next.js server with 'npm run dev' first."
  exit 1
fi

print_colored "blue" "Starting API tests..."

# Test 1: Lane with complete destination data (should pass)
print_colored "yellow" "\n1. Testing lane with COMPLETE destination data (should pass)"
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
  }' | jq .

# Test 2: Lane with only destination city (should pass)
print_colored "yellow" "\n2. Testing lane with ONLY destination city (should pass)"
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
  }' | jq .

# Test 3: Lane with only destination state (should pass)
print_colored "yellow" "\n3. Testing lane with ONLY destination state (should pass)"
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
  }' | jq .

# Test 4: Lane with no destination data (should fail)
print_colored "yellow" "\n4. Testing lane with NO destination data (should fail)"
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
  }' | jq .

print_colored "blue" "\nTest complete! Review the results above."
print_colored "green" "Remember to check browser console logs for additional validation details."
echo -e "\n"