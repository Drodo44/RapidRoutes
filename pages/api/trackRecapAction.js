// pages/api/trackRecapAction.js
// Save recap tracking data to database for learning and analytics


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
    const { 
      laneId, 
      postedPairId, 
      actionType, 
      pickupDistance, 
      deliveryDistance, 
      notes 
    } = req.body;

    if (!laneId || !postedPairId || !actionType) {
      return res.status(400).json({ 
        error: 'laneId, postedPairId, and actionType are required' 
      });
    }

    if (!['email', 'call', 'covered'].includes(actionType)) {
      return res.status(400).json({ 
        error: 'actionType must be email, call, or covered' 
      });
    }

    // For now, we'll create a simple tracking record
    // In production, you might want to first create/find the lane_posting record
    const { data, error } = await supabase
      .from('recap_tracking')
      .insert({
        lane_id: laneId,
        lane_posting_id: postedPairId, // For now using this as identifier
        action_type: actionType,
        pickup_distance_miles: pickupDistance,
        delivery_distance_miles: deliveryDistance,
        notes: notes || null
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save tracking data: ${error.message}`);
    }

    res.status(200).json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Error saving recap tracking:', error);
    res.status(500).json({ error: error.message });
  }
}
