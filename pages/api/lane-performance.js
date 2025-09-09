// pages/api/lane-performance.js
// pages/api/lane-performance.js
// Track intelligent lane posting performance for continuous learning

import { adminSupabase } from '../../utils/supabaseClient';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    return trackLanePerformance(req, res);
  } else if (req.method === 'GET') {
    return getLaneIntelligence(req, res);
  } else {
    res.setHeader('Allow', ['POST', 'GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function trackLanePerformance(req, res) {
  try {
    const {
      lane_id,
      equipment_code,
      origin_city,
      origin_state,
      dest_city,
      dest_state,
      crawl_cities,
      intelligence_metadata
    } = req.body;

    // Validate required fields
    if (!lane_id || !equipment_code || !origin_city || !origin_state || !dest_city || !dest_state) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert lane performance record
    const { data: lanePerf, error: lanePerfError } = await adminSupabase
      .from('lane_performance')
      .insert({
        lane_id,
        equipment_code: equipment_code.toUpperCase(),
        origin_city,
        origin_state: origin_state.toUpperCase(),
        dest_city,
        dest_state: dest_state.toUpperCase(),
        crawl_cities,
        success_metrics: intelligence_metadata || {}
      })
      .select()
      .single();

  if (lanePerfError) throw lanePerfError;
  if (!lanePerf) throw new Error('Supabase did not return lane performance row after insert');

    // Track individual crawl city performance
    if (crawl_cities && crawl_cities.length > 0) {
      const crawlRecords = [];
      
      crawl_cities.forEach(crawl => {
        if (crawl.pickup) {
          crawlRecords.push({
            lane_performance_id: lanePerf.id,
            city: crawl.pickup.city,
            state: crawl.pickup.state,
            kma_code: crawl.pickup.kma_code,
            position_type: 'pickup',
            intelligence_score: crawl.score || 0.5
          });
        }
        
        if (crawl.delivery) {
          crawlRecords.push({
            lane_performance_id: lanePerf.id,
            city: crawl.delivery.city,
            state: crawl.delivery.state,
            kma_code: crawl.delivery.kma_code,
            position_type: 'delivery',
            intelligence_score: crawl.score || 0.5
          });
        }
      });

      if (crawlRecords.length > 0) {
        const { error: crawlError } = await adminSupabase
          .from('crawl_city_performance')
          .insert(crawlRecords);

        if (crawlError) {
          console.warn('Failed to track crawl city performance:', crawlError);
          // Don't fail the whole request for this
        }
      }
    }

    return res.status(201).json({
      success: true,
      performance_id: lanePerf.id,
      message: 'Lane performance tracking initiated'
    });

  } catch (error) {
    console.error('Failed to track lane performance:', error);
    // If DB relation missing or permission issue, enqueue payload for later processing
    const errMsg = String(error?.message || 'unknown');
    if (/relation .* does not exist|permission denied|table .* does not exist/i.test(errMsg)) {
      try {
        const queuePayload = { ...req.body, error: errMsg };
        await adminSupabase.from('performance_queue').insert([{ payload: queuePayload }]);
        return res.status(202).json({ accepted: true, queued: true });
      } catch (qErr) {
        console.error('Failed to enqueue performance payload:', qErr);
        // fall through to return full error
      }
    }

    const payload = { error: error.message || 'Failed to track performance' };
    if (process.env.NODE_ENV !== 'production') payload.stack = error.stack;
    return res.status(500).json(payload);
  }
}

async function getLaneIntelligence(req, res) {
  try {
    const { equipment, city, state, type = 'pickup' } = req.query;

    if (!equipment) {
      return res.status(400).json({ error: 'Equipment type required' });
    }

    // Get top performing cities for this equipment type
    const { data: topCities, error: topCitiesError } = await adminSupabase
      .rpc('get_top_cities_for_equipment', {
        p_equipment: equipment.toUpperCase(),
        p_position_type: type,
        p_limit: 20
      });

    if (topCitiesError) throw topCitiesError;

    // Get recent performance trends
    const { data: recentPerformance, error: recentError } = await adminSupabase
      .from('lane_performance')
      .select(`
        equipment_code,
        origin_city,
        origin_state,
        dest_city,
        dest_state,
        posted_at,
        success_metrics
      `)
      .eq('equipment_code', equipment.toUpperCase())
      .order('posted_at', { ascending: false })
      .limit(50);

    if (recentError) throw recentError;

    return res.status(200).json({
      equipment_type: equipment.toUpperCase(),
      top_cities: topCities || [],
      recent_performance: recentPerformance || [],
      intelligence_summary: {
        total_tracked_lanes: recentPerformance?.length || 0,
        top_performing_cities: topCities?.slice(0, 5) || [],
        recommendations: generateRecommendations(equipment, topCities)
      }
    });

  } catch (error) {
    console.error('Failed to get lane intelligence:', error);
    return res.status(500).json({ error: 'Failed to retrieve intelligence data' });
  }
}

function generateRecommendations(equipment, topCities) {
  if (!topCities || topCities.length === 0) {
    return ['Insufficient data for recommendations'];
  }

  const recommendations = [];
  const eq = equipment.toUpperCase();

  if (eq === 'R' || eq === 'IR') {
    recommendations.push('Focus on produce regions and cold storage facilities');
    recommendations.push('Target import/export hubs for consistent backhauls');
  } else if (eq === 'FD' || eq === 'F') {
    recommendations.push('Prioritize steel and manufacturing corridors');
    recommendations.push('Target ports for heavy equipment movement');
  } else if (eq === 'V') {
    recommendations.push('Focus on distribution and retail hubs');
    recommendations.push('Target e-commerce fulfillment centers');
  }

  // Add city-specific recommendations
  const topPerformers = topCities.slice(0, 3).map(c => `${c.city}, ${c.state}`);
  if (topPerformers.length > 0) {
    recommendations.push(`Top performing cities: ${topPerformers.join(', ')}`);
  }

  return recommendations;
}
