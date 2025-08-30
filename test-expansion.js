// Test intelligent expansion across different freight quality scenarios
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testIntelligentExpansion() {
  console.log('🧪 TESTING INTELLIGENT EXPANSION ACROSS FREIGHT SCENARIOS');
  console.log('========================================================');
  
  const { generateDefinitiveIntelligentPairs } = await import('./lib/definitiveIntelligent.js');
  
  const testRoutes = [
    { name: 'High-traffic corridor', origin: { city: 'Seaboard', state: 'NC' }, destination: { city: 'Paradise', state: 'PA' } },
    { name: 'Rural route', origin: { city: 'Mansfield', state: 'AR' }, destination: { city: 'Maysville', state: 'MO' } },
  ];
  
  for (const route of testRoutes) {
    console.log(`\n🔄 Testing ${route.name}: ${route.origin.city}, ${route.origin.state} → ${route.destination.city}, ${route.destination.state}`);
    
    try {
      const result = await generateDefinitiveIntelligentPairs({
        origin: route.origin,
        destination: route.destination,
        equipment: 'FD',
        preferFillTo10: true,
        usedCities: new Set()
      });
      
      console.log(`📊 Results: ${result.pairs?.length || 0} pairs generated`);
      console.log(`📈 Row output: ${(result.pairs?.length + 1) * 2} rows for this lane`);
      
      if (result.pairs?.length > 5) {
        console.log('✅ INTELLIGENT EXPANSION ACTIVATED');
      } else if (result.pairs?.length === 5) {
        console.log('🎯 MINIMUM GUARANTEE MET');
      } else {
        console.log('⚠️  Below minimum - nuclear guarantee should activate');
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

testIntelligentExpansion();
