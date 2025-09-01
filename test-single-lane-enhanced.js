#!/usr/bin/env node

/**
 * SINGLE LANE TEST: Verify enhanced system generates 5 pairs per lane
 */

import { adminSupabase as supabase } from './utils/supabaseClient.js';
import { FreightIntelligence } from './lib/FreightIntelligence.js';
import { rowsFromBaseAndPairs } from './lib/datCsvBuilder.js';

async function testSingleLane() {
  console.log('🧪 SINGLE LANE TEST: Intelligent System Performance');
  console.log('');

  try {
    // Get one active lane
    const { data: lanes, error } = await supabase
      .from('lanes')
      .select('*')
      .eq('status', 'active')
      .limit(1);

    if (error) {
      console.error('❌ Database error:', error);
      return;
    }

    if (!lanes || lanes.length === 0) {
      console.error('❌ No active lanes found');
      return;
    }

    const lane = lanes[0];
    console.log(`🎯 Testing lane: ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`);
    console.log(`📦 Equipment: ${lane.equipment_code}, Weight: ${lane.weight_lbs} lbs`);
    console.log('');

    // Test with production intelligence system
    console.log('🧠 INTELLIGENT SYSTEM TEST:');
    const intelligence = new FreightIntelligence();
    const result = await intelligence.generateDiversePairs({
      origin: {
        city: lane.origin_city,
        state: lane.origin_state,
        zip: lane.origin_zip
      },
      destination: {
        city: lane.dest_city,
        state: lane.dest_state,
        zip: lane.dest_zip
      },
      equipment: lane.equipment_code,
      preferFillTo10: true
    });
    
    console.log(`  • KMA diversity score: ${calculateKMADiversity(result.pairs)}`);
    console.log(`  • Pairs generated: ${result.pairs.length}`);
    console.log(`  • Expected pairs: 6-10`);
    
    if (result.pairs.length > 0) {
      console.log('  • Sample pairs:');
      result.pairs.slice(0, 3).forEach((pair, i) => {
        console.log(`    ${i+1}. ${pair.pickup.city}, ${pair.pickup.state} (${pair.geographic?.pickup_kma}) → ${pair.delivery.city}, ${pair.delivery.state} (${pair.geographic?.delivery_kma})`);
      });
    }

    // Generate rows for DAT export
    const rows = result.pairs.flatMap(pair => {
      const base = {
        'Pickup Earliest*': lane.pickup_earliest || '12/01/2024',
        'Pickup Latest': lane.pickup_latest || lane.pickup_earliest || '12/02/2024',
        'Length (ft)*': String(lane.length_ft || 48),
        'Weight (lbs)*': String(lane.weight_lbs || Math.floor(46750 + Math.random() * 1250)),
        'Full/Partial*': lane.full_partial || 'full',
        'Equipment*': lane.equipment_code || 'FD',
        'Use Private Network*': 'NO',
        'Private Network Rate': '',
        'Allow Private Network Booking': '',
        'Allow Private Network Bidding': '',
        'Use DAT Loadboard*': 'yes',
        'DAT Loadboard Rate': '',
        'Allow DAT Loadboard Booking': '',
        'Use Extended Network': '',
        'Origin City*': pair.pickup.city,
        'Origin State*': pair.pickup.state,
        'Origin Postal Code': pair.pickup.zip || '',
        'Destination City*': pair.delivery.city,
        'Destination State*': pair.delivery.state,
        'Destination Postal Code': pair.delivery.zip || '',
        'Comment': lane.comment || '',
        'Commodity': lane.commodity || '',
        'Reference ID': `RR${String(Math.abs(lane.id?.hashCode?.() || Math.random() * 100000)).padStart(5, '0')}`
      };

      // Generate one row for each contact method
      return [
        { ...base, 'Contact Method*': 'email' },
        { ...base, 'Contact Method*': 'primary phone' }
      ];
    });

    console.log('\n📊 DAT EXPORT ANALYSIS:');
    console.log(`  • Total rows: ${rows.length} (${rows.length/2} postings × 2 contacts)`);
    console.log(`  • Expected rows: 12-20 (6-10 pairs × 2 contacts)`);
    console.log(`  • KMA diversity: ${calculateKMADiversity(result.pairs)}%`);
    console.log(`  • Average distance: ${calculateAverageDistance(result.pairs)} miles`);
    console.log('');

    if (result.pairs.length < 6) {
      console.log('🚨 ISSUE DETECTED:');
      console.log(`  • System only generated ${result.pairs.length} pairs (minimum 6 required)`);
      console.log('  • Need to investigate why intelligent system is not meeting minimum pair requirement');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

function calculateKMADiversity(pairs) {
  if (!pairs?.length) return 0;
  
  const uniquePickupKMAs = new Set(pairs.map(p => p.geographic?.pickup_kma));
  const uniqueDeliveryKMAs = new Set(pairs.map(p => p.geographic?.delivery_kma));
  
  const pickupScore = (uniquePickupKMAs.size / pairs.length) * 100;
  const deliveryScore = (uniqueDeliveryKMAs.size / pairs.length) * 100;
  
  return Math.round((pickupScore + deliveryScore) / 2);
}

function calculateAverageDistance(pairs) {
  if (!pairs?.length) return 0;
  
  const distances = pairs.map(p => (
    (p.geographic?.pickup_distance || 0) + 
    (p.geographic?.delivery_distance || 0)
  ) / 2);
  
  const average = distances.reduce((a, b) => a + b, 0) / distances.length;
  return Math.round(average);
}

testSingleLane();
      console.log(`  • This explains why bulk export gave 64 rows instead of 108`);
      console.log(`  • Need to investigate why intelligent fallbacks aren't working`);
    } else {
      console.log('✅ ENHANCED SYSTEM WORKING:');
      console.log(`  • Generated ${enhancedCrawl.pairs.length} pairs as expected`);
      console.log(`  • Issue must be elsewhere in the bulk export process`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSingleLane();
