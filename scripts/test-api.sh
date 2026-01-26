#!/bin/bash
# test-api.sh - Test the intelligence-pairing API using curl

echo "🧪 Testing intelligence-pairing API with curl"

# Test with camelCase fields
echo -e "\n\033[1;34mTest 1: camelCase fields\033[0m"
curl -X POST https://rapid-routes.vercel.app/api/intelligence-pairing \
  -H "Content-Type: application/json" \
  -d '{
    "originCity": "Chicago",
    "originState": "IL",
    "destinationCity": "Atlanta",
    "destinationState": "GA",
    "equipmentCode": "V",
    "test_mode": true
  }'
  
echo -e "\n\n\033[1;34mTest 2: snake_case fields\033[0m"
curl -X POST https://rapid-routes.vercel.app/api/intelligence-pairing \
  -H "Content-Type: application/json" \
  -d '{
    "origin_city": "Chicago",
    "origin_state": "IL",
    "destination_city": "Atlanta",
    "destination_state": "GA",
    "equipment_code": "V",
    "test_mode": true
  }'
  
echo -e "\n\n\033[1;34mTest 3: Mixed fields with dest_ prefix\033[0m"
curl -X POST https://rapid-routes.vercel.app/api/intelligence-pairing \
  -H "Content-Type: application/json" \
  -d '{
    "originCity": "Chicago",
    "originState": "IL",
    "dest_city": "Atlanta",
    "dest_state": "GA",
    "equipmentCode": "V",
    "test_mode": true
  }'
  
echo -e "\n\n\033[1;34mTest 4: With missing equipmentCode\033[0m"
curl -X POST https://rapid-routes.vercel.app/api/intelligence-pairing \
  -H "Content-Type: application/json" \
  -d '{
    "originCity": "Chicago",
    "originState": "IL",
    "destinationCity": "Atlanta",
    "destinationState": "GA",
    "test_mode": true
  }'

echo -e "\n"