export default async function handler(req, res) {
  // Accept both GET and POST methods for easier testing
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed', allowed: ['POST', 'GET'] });
  }

  const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  console.log(`[${requestId}] 🔍 KMA Lookup request:`, req.method === 'GET' ? req.query : req.body);

  // Handle both GET and POST parameters
  const params = req.method === 'GET' ? req.query : (req.body || {});
  const {
    lane_id = params.laneId,
    origin_city = params.originCity,
    origin_state = params.originState,
    destination_city = params.destinationCity,
    destination_state = params.destinationState,
    equipment_code = params.equipmentCode || 'V'
  } = params;

  const required = { lane_id, origin_city, origin_state, destination_city, destination_state, equipment_code };
  const missing = Object.entries(required).filter(([_, v]) => !v).map(([k]) => k);
  if (missing.length) {
    return res.status(400).json({ error: 'Missing required fields', missing, status: 400 });
  }

  // Mock response - replace this with actual Supabase or HERE API KMA lookup logic
  return res.status(200).json({
    success: true,
    requestId,
    origin: {
      city: origin_city,
      state: origin_state,
      kma_code: 'ORIGIN_KMA_CODE',
      kma_name: 'Origin KMA Name'
    },
    destination: {
      city: destination_city,
      state: destination_state,
      kma_code: 'DEST_KMA_CODE',
      kma_name: 'Destination KMA Name'
    }
  });
}