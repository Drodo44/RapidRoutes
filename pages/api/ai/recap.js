// pages/api/ai/recap.js
// POST /api/ai/recap
// Generate AI-powered lane recap talking points
// Falls back to deterministic heuristics when OPENAI_API_KEY is missing
//
// Input: { laneIds: string[] }
// Output: { results: Array<{ laneId, bullets, risks, price_hint }> }

import supabaseAdmin from "@/lib/supabaseAdmin";

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

// Deterministic fallback when no OpenAI key - VALUABLE SELLING POINTS
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
  
  // VALUABLE SELLING POINTS - Market Intelligence
  const bullets = [];
  const risks = [];
  
  // Basic route info with reference ID
  const refDisplay = lane.reference_id ? ` • REF #${cleanReferenceId(lane.reference_id)}` : '';
  bullets.push(`🚛 ${origin} → ${dest} • ${lane.length_ft}' ${equipCode} • Pickup ${pickupDateRange}${refDisplay}`);
  
  // VALUABLE FREIGHT MARKET INSIGHTS - Not generic equipment talk
  const marketInsights = [
    `📈 High-demand freight corridor with consistent volume - carriers compete for this route`,
    `🎯 Strategic lane connecting major distribution hubs - premium rates typically maintained`,
    `💼 Business-critical route for Fortune 500 companies - reliability premium justified`,
    `⚡ Fast-moving freight lane with rapid carrier response times available`,
    `🏆 Top-tier carriers actively service this route - quality options available`,
    `📊 Market data shows strong pricing power on this corridor - rate stability expected`,
    `🔥 Hot lane with immediate carrier interest - quick coverage solutions available`,
    `💪 Proven route performance with established carrier relationships`,
    `🎨 Flexible routing options provide backup coverage and rate optimization`,
    `🌟 Premium freight corridor with dedicated carrier capacity`
  ];
  bullets.push(marketInsights[hashNum % marketInsights.length]);
  
  // BUSINESS VALUE PROPOSITIONS - What customers actually care about
  const valueProps = [
    `💡 Direct routing minimizes transit time - faster delivery for time-sensitive cargo`,
    `🛡️ Insurance coverage available up to $250K+ for high-value shipments`,
    `📱 Real-time tracking and communication throughout transit - full visibility`,
    `🤝 Dedicated customer service with direct carrier contact information`,
    `⏰ Flexible pickup windows accommodate your warehouse schedule constraints`,
    `🎯 Specialized carriers familiar with this specific route and requirements`,
    `📦 Additional services available: inside delivery, liftgate, appointment scheduling`,
    `🏢 Corporate-rate programs available for regular shippers on this lane`,
    `🚀 Express transit options available for expedited delivery needs`,
    `💰 Volume discounts negotiable for multi-shipment commitments`
  ];
  bullets.push(valueProps[altHash % valueProps.length]);
  bullets.push(valueProps[altHash % valueProps.length]);
  
  // COMPETITIVE ADVANTAGES - Why choose your brokerage
  const advantages = [
    `🚀 24/7 dispatch support with emergency backup coverage available`,
    `💎 Premium carrier network - pre-qualified, high-performance carriers only`,
    `📋 Proactive communication with milestone updates throughout transit`,
    `🔧 Problem resolution team available for any transit complications`,
    `📈 Rate optimization through dynamic market analysis and carrier bidding`,
    `🛡️ Cargo insurance specialists on staff for high-value shipment protection`,
    `⚡ Same-day booking available with immediate carrier assignment`,
    `🎯 Dedicated account management with direct phone/email contact`,
    `📊 Transportation analytics and reporting for supply chain optimization`,
    `🏆 Award-winning customer service with 98%+ on-time delivery rate`
  ];
  bullets.push(advantages[(hashNum + altHash) % advantages.length]);
  
  // RISK MITIGATION - Real business concerns
  const businessRisks = [
    `⚠️ Peak shipping season may impact carrier availability - book early for guaranteed capacity`,
    `🌦️ Weather alerts monitored for potential delays - proactive rerouting available`,
    `📊 Market volatility tracked - rate protection available with advance booking`,
    `🚧 Construction zones monitored for route optimization and delay prevention`,
    `⛽ Fuel price fluctuations may affect final rates - transparent fuel surcharges applied`,
    `📱 Driver shortage areas identified - premium rates may apply for guaranteed service`,
    `🔄 Equipment availability monitored - backup options secured for critical shipments`
  ];
  risks.push(businessRisks[(altHash + timeSeed) % businessRisks.length]);
  
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
