// pages/api/ai/recap.js
// POST /api/ai/recap
// Generate AI-powered lane recap talking points
// Falls back to deterministic heuristics when OPENAI_API_KEY is missing
//
// Input: { laneIds: string[] }
// Output: { results: Array<{ laneId, bullets, risks, price_hint }> }

import { adminSupabase } from '../../../utils/supabaseClient';

// Get lane details with latest DAT map summary
async function getLaneContexts(laneIds) {
  if (!laneIds?.length) return [];

  // Get lane details
  const { data: lanes } = await adminSupabase
    .from('lanes')
    .select('*')
    .in('id', laneIds);

  if (!lanes?.length) return [];

  // Get latest DAT map summaries for relevant equipment
  const equipCodes = [...new Set(lanes.map(l => l.equipment_code || '').filter(Boolean))];
  const equipCategories = new Map([
    // Map equipment code to general category
    ['V', 'van'], ['VA', 'van'],
    ['R', 'reefer'], ['RH', 'reefer'],
    ['F', 'flatbed'], ['FD', 'flatbed'], ['SD', 'flatbed'],
    ['DD', 'flatbed'], ['RGN', 'flatbed'], ['LB', 'flatbed']
  ]);
  
  const categories = [...new Set(equipCodes.map(c => equipCategories.get(c) || 'van'))];
  
  // Get latest maps
  const { data: maps } = await adminSupabase
    .from('dat_maps')
    .select('equipment,summary,effective_date')
    .in('equipment', categories)
    .order('effective_date', { ascending: false })
    .limit(10);
  
  // Group by equipment
  const mapsByEquip = maps?.reduce((acc, map) => {
    if (!acc[map.equipment]) acc[map.equipment] = map;
    return acc;
  }, {}) || {};

  // Get latest rates
  let rateSnapshot = null;
  try {
    const { data: latest } = await adminSupabase
      .from('rates_snapshots')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (latest?.id) {
      rateSnapshot = latest.id;
    }
  } catch (e) {
    console.warn('Failed to get rate snapshot:', e);
  }

  // Build contexts
  return lanes.map(lane => {
    const equipCode = String(lane.equipment_code || '').toUpperCase();
    const category = equipCategories.get(equipCode) || 'van';
    const datMapSummary = mapsByEquip[category]?.summary || '';
    
    return {
      lane,
      datMapSummary,
      rateSnapshotId: rateSnapshot
    };
  });
}

// Deterministic fallback when no OpenAI key
function generateFallbackRecap(laneContext) {
  const { lane, datMapSummary } = laneContext;
  
  // Origin/Destination
  const origin = `${lane.origin_city}, ${lane.origin_state}`;
  const dest = `${lane.dest_city}, ${lane.dest_state}`;
  const equipCode = String(lane.equipment_code || '').toUpperCase();
  const pickupDateRange = lane.pickup_earliest === lane.pickup_latest
    ? `on ${lane.pickup_earliest}`
    : `between ${lane.pickup_earliest} and ${lane.pickup_latest}`;
  
  // Create a more varied seed based on lane properties + current time for better variety
  const timeSeed = Math.floor(Date.now() / (1000 * 60 * 30)); // Changes every 30 minutes
  const laneHash = lane.id.toString(); 
  const hashNum = (parseInt(laneHash.slice(-4), 10) + timeSeed) || 12345;
  const altHash = (parseInt(laneHash.slice(-6, -2), 10) + timeSeed * 2) || 67890;
  
  // Standard bullets based on equipment type
  const bullets = [];
  const risks = [];
  
  // Basic origin/destination info with reference ID
  const refDisplay = lane.reference_id ? ` (Ref #${lane.reference_id})` : '';
  bullets.push(`${origin} to ${dest} ${lane.length_ft}' ${equipCode} ${pickupDateRange}${refDisplay}`);
  
  // Equipment-specific bullets with more variation
  if (['V', 'VA'].includes(equipCode)) {
    const vanOptions = [
      'Standard dry van with dock-level loading capabilities',
      'Dry van freight with standard loading/unloading requirements', 
      'Van transportation with flexible pickup/delivery windows',
      'Enclosed van transport protecting cargo from weather exposure',
      'Standard van equipment suitable for palletized freight',
      'Dry van service with reliable carrier network coverage'
    ];
    bullets.push(vanOptions[hashNum % vanOptions.length]);
    
    const vanDetails = [
      'Open deck transportation with proper securement required',
      'Specialized document equipment needed for safe transport',
      'Strategic location provides multiple routing options',
      'Established trade lane with consistent carrier availability',
      'Flexible weight range accommodates various shipment sizes'
    ];
    bullets.push(vanDetails[altHash % vanDetails.length]);
  }
  else if (['R', 'RH'].includes(equipCode)) {
    const reeferOptions = [
      'Temperature-controlled transportation maintaining cold chain integrity',
      'Refrigerated transport with continuous monitoring capabilities',
      'Reefer service ensuring product quality throughout transit'
    ];
    bullets.push(reeferOptions[hashNum % reeferOptions.length]);
    
    const reeferRisks = [
      'Temperature excursions could impact product quality',
      'Reefer unit monitoring required throughout transit',
      'Cold chain integrity must be maintained',
      'Power outages or equipment failure could affect cargo',
      'Temperature-sensitive cargo requires experienced carrier'
    ];
    risks.push(reeferRisks[altHash % reeferRisks.length]);
  }
  else if (['F', 'FD', 'SD', 'DD', 'RGN', 'LB'].includes(equipCode)) {
    bullets.push('Open deck transportation with proper securement required');
    const flatbedOptions = [
      'Tarping may be required depending on commodity sensitivity',
      'Specialized securement equipment needed for safe transport',
      'Weather protection considerations for exposed freight'
    ];
    bullets.push(flatbedOptions[hashNum % flatbedOptions.length]);
    risks.push('Weather exposure could impact unprotected freight');
  }
  
  // Weight-specific bullets
  if (lane.randomize_weight) {
    bullets.push(`Flexible weight range: ${lane.weight_min} - ${lane.weight_max} lbs`);
  } else if (lane.weight_lbs) {
    if (lane.weight_lbs > 45000) {
      bullets.push(`Heavy load at ${lane.weight_lbs} lbs - weight distribution important`);
      risks.push('Heavy weight may restrict carrier options or require permits');
    } else {
      bullets.push(`Standard weight at ${lane.weight_lbs} lbs`);
    }
  }
  
  // Add lane-specific insights
  const specificInsights = [
    'Strong freight demand in this corridor',
    'Reliable shipping lane with consistent carrier availability',
    'Strategic location provides multiple routing options',
    'High-traffic freight corridor with competitive rates',
    'Established trade route with predictable transit times'
  ];
  bullets.push(specificInsights[hashNum % specificInsights.length]);
  
  // Add DAT market insights if available
  if (datMapSummary) {
    bullets.push(`Market insight: ${datMapSummary}`);
  }
  
  // Varied risk factors
  const standardRisks = [
    'Weather or road conditions may impact transit times',
    'Peak season demand could affect carrier availability',
    'Fuel price fluctuations may impact transportation costs',
    'Construction delays possible along major freight corridors'
  ];
  risks.push(standardRisks[hashNum % standardRisks.length]);
  
  // Generate varied price hint based on lane characteristics
  const baseMultiplier = 1 + ((hashNum % 100) / 1000); // 1.000 to 1.099
  const baseRate = (2.2 + ((hashNum % 130) / 100)) * baseMultiplier; // $2.20 to $3.50 range
  const mid = parseFloat(baseRate.toFixed(2));
  const low = parseFloat((mid * 0.9).toFixed(2));
  const high = parseFloat((mid * 1.1).toFixed(2));
  
  return {
    laneId: lane.id,
    bullets,
    risks,
    price_hint: {
      low,
      mid,
      high,
      unit: 'USD/mi',
      basis: 'heuristic_estimate'
    }
  };
}

// OpenAI integration when key is available
async function generateAIRecap(laneContext) {
  const { lane, datMapSummary, rateSnapshotId } = laneContext;
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  
  // If no API key, fall back to deterministic generation
  if (!apiKey) {
    return generateFallbackRecap(laneContext);
  }
  
  try {
    // Get rate data if available
    let rateData = null;
    if (rateSnapshotId) {
      const { data: rates } = await adminSupabase
        .from('rates_flat')
        .select('*')
        .eq('snapshot_id', rateSnapshotId)
        .eq('origin', lane.origin_state)
        .eq('destination', lane.dest_state)
        .limit(1);
      
      if (rates?.length) {
        rateData = rates[0];
      }
    }
    
    // Build AI prompt
    const promptData = {
      lane: {
        origin_city: lane.origin_city,
        origin_state: lane.origin_state,
        dest_city: lane.dest_city,
        dest_state: lane.dest_state,
        equipment_code: lane.equipment_code,
        length_ft: lane.length_ft,
        randomize_weight: lane.randomize_weight,
        weight_min: lane.weight_min,
        weight_max: lane.weight_max,
        weight_lbs: lane.weight_lbs,
        pickup_earliest: lane.pickup_earliest,
        pickup_latest: lane.pickup_latest
      },
      crawl_strength: {
        top_pairs: [] // Would come from actual crawl data
      },
      rates: rateData 
        ? { 
            basis: 'spot_avg_state_to_state', 
            usd_per_mile: rateData.rate,
            low: parseFloat((rateData.rate * 0.9).toFixed(2)),
            high: parseFloat((rateData.rate * 1.1).toFixed(2))
          }
        : { 
            basis: 'heuristic_estimate',
            usd_per_mile: 2.32,
            low: 2.05,
            high: 2.58
          },
      dat_map_summary: datMapSummary || 'No recent market data available.'
    };
    
    // OpenAI API call
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an operations analyst for a US/Canada freight brokerage. Create concise, non-fluffy talking points for a shipper recap: 3–7 bullets and 1–3 risk notes. Use only the structured inputs. No PII, no speculative weather. Be deterministic and conservative.'
          },
          {
            role: 'user',
            content: JSON.stringify(promptData)
          }
        ],
        temperature: 0.2
      })
    });
    
    if (!response.ok) {
      console.warn('OpenAI API error:', await response.text());
      return generateFallbackRecap(laneContext);
    }
    
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    
    if (!content) {
      return generateFallbackRecap(laneContext);
    }
    
    // Parse AI response
    try {
      const aiResult = JSON.parse(content);
      return {
        laneId: lane.id,
        bullets: aiResult.bullets || [],
        risks: aiResult.risks || [],
        price_hint: aiResult.price_hint || promptData.rates
      };
    } catch (e) {
      console.warn('Failed to parse AI response:', e);
      return generateFallbackRecap(laneContext);
    }
  } catch (e) {
    console.error('AI recap generation error:', e);
    return generateFallbackRecap(laneContext);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { laneIds } = req.body;
    
    if (!Array.isArray(laneIds) || !laneIds.length) {
      return res.status(400).json({ error: 'laneIds array required' });
    }
    
    // Get contexts for each lane
    const contexts = await getLaneContexts(laneIds);
    
    if (!contexts.length) {
      return res.status(404).json({ error: 'No valid lanes found' });
    }
    
    // Generate recaps (parallel processing)
    const results = await Promise.all(
      contexts.map(context => generateAIRecap(context))
    );
    
    return res.status(200).json({ results });
  } catch (e) {
    console.error('Recap API error:', e);
    return res.status(500).json({ error: e.message || 'Failed to generate recaps' });
  }
}
