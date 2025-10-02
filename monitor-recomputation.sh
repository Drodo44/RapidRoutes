#!/bin/bash
# Monitor the recomputation progress

echo "=== RECOMPUTATION MONITOR ==="
echo ""

# Show last 20 lines of the log
echo "Recent progress:"
tail -20 recomputation-log.txt 2>/dev/null || echo "Log file not created yet..."

echo ""
echo "---"
echo ""

# Check a few sample cities to see if they've been updated
export $(cat .env.local | xargs)
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const testCities = [
    { city: 'Chicago', state: 'IL' },
    { city: 'Dallas', state: 'TX' },
    { city: 'New York', state: 'NY' }
  ];
  
  console.log('Sample city status:');
  console.log('');
  
  for (const test of testCities) {
    const { data } = await supabase
      .from('cities')
      .select('city, state_or_province, nearby_cities')
      .eq('city', test.city)
      .eq('state_or_province', test.state)
      .limit(1)
      .single();
    
    if (data && data.nearby_cities) {
      const totalCities = Object.values(data.nearby_cities.kmas || {}).reduce((sum, arr) => sum + arr.length, 0);
      const kmaCount = Object.keys(data.nearby_cities.kmas || {}).length;
      const computedAt = new Date(data.nearby_cities.computed_at);
      const isUpdated = data.nearby_cities.computed_at >= '2025-10-02T20:00:00.000Z';
      
      console.log(\`\${data.city}, \${data.state_or_province}:\`);
      console.log(\`  Status: \${isUpdated ? '✅ UPDATED' : '⏳ OLD DATA'}\`);
      console.log(\`  Cities: \${totalCities} in \${kmaCount} KMAs\`);
      console.log(\`  Time: \${computedAt.toLocaleTimeString()}\`);
      console.log('');
    }
  }
})();
"
