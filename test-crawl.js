// Quick test script to debug intelligent pair generation
import { FreightIntelligence } from './lib/FreightIntelligence.js';

// Mock minimal environment for testing
globalThis.console = console;

async function testIntelligentGeneration() {
  try {
    console.log('🧠 Testing intelligent pair generation...');
    
    const intelligence = new FreightIntelligence();
    const result = await intelligence.generateDiversePairs({
      origin: { 
        city: 'Maplesville', 
        state: 'AL',
        zip: ''
      },
      destination: { 
        city: 'Sweetwater', 
        state: 'TN',
        zip: ''
      },
      equipment: 'FD',
      preferFillTo10: true
    });
    
    console.log('\n📊 INTELLIGENCE RESULTS:');
    console.log(`• Generated ${result.pairs.length} pairs`);
    console.log('• Target: 6-10 pairs with maximum KMA diversity');
    
    if (result.pairs.length > 0) {
      console.log('\n🔍 Generated Pairs:');
      result.pairs.forEach((pair, i) => {
        console.log(`\n${i + 1}. ${pair.pickup.city}, ${pair.pickup.state} -> ${pair.delivery.city}, ${pair.delivery.state}`);
        console.log(`   Score: ${pair.score?.toFixed(2) || 'N/A'}`);
        console.log(`   KMAs: ${pair.geographic.pickup_kma} -> ${pair.geographic.delivery_kma}`);
        console.log(`   Distances: ${Math.round(pair.geographic.pickup_distance)}mi pickup, ${Math.round(pair.geographic.delivery_distance)}mi delivery`);
      });
      
            // Calculate KMA diversity
      const pickupKMAs = new Set(result.pairs.map(p => p.geographic.pickup_kma));
      const deliveryKMAs = new Set(result.pairs.map(p => p.geographic.delivery_kma));
      const kmaScore = ((pickupKMAs.size + deliveryKMAs.size) / (result.pairs.length * 2)) * 100;
      
      console.log('\nKMA Diversity Analysis:');
      console.log(`- KMA Diversity Score: ${kmaScore.toFixed(1)}%`);
      console.log(`- Unique Pickup KMAs: ${pickupKMAs.size}`);
      console.log(`- Unique Delivery KMAs: ${deliveryKMAs.size}`);

      // Calculate average distances
      const avgPickupDist = result.pairs.reduce((sum, p) => sum + p.geographic.pickup_distance, 0) / result.pairs.length;
      const avgDeliveryDist = result.pairs.reduce((sum, p) => sum + p.geographic.delivery_distance, 0) / result.pairs.length;
      
      console.log('\nDistance Analysis:');
      console.log(`- Average Pickup Distance: ${Math.round(avgPickupDist)} miles`);
      console.log(`- Average Delivery Distance: ${Math.round(avgDeliveryDist)} miles`);
    }
  } catch (error) {
    console.error('INTELLIGENCE TEST ERROR:', error);
  }
}

// Run the test
testIntelligentGeneration();
    }
      
      // Calculate average distances
      const avgPickupDist = result.pairs.reduce((sum, p) => sum + p.geographic.pickup_distance, 0) / result.pairs.length;
      const avgDeliveryDist = result.pairs.reduce((sum, p) => sum + p.geographic.delivery_distance, 0) / result.pairs.length;
      
      console.log('\n📍 Distance Analysis:');
      console.log(`• Average Pickup Distance: ${Math.round(avgPickupDist)} miles`);
      console.log(`• Average Delivery Distance: ${Math.round(avgDeliveryDist)} miles`);
    }
    
  } catch (error) {
    console.error('❌ INTELLIGENCE TEST ERROR:', error);
  }
}

// Run the test
testIntelligentGeneration();
