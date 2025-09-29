export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      originCity,
      originState,
      originZip3,
      destinationCity,
      destinationState,
      destinationZip3,
      equipmentCode,
    } = req.body || {};

    if (!originZip3 || !destinationZip3) {
      return res.status(400).json({ error: 'Missing zip3 codes' });
    }

    console.log('[PAIRING] Received:', {
      originCity,
      originState,
      originZip3,
      destinationCity,
      destinationState,
      destinationZip3,
      equipmentCode,
    });

    return res.status(200).json({
      success: true,
      pairing: {
        origin: { city: originCity, state: originState, zip3: originZip3 },
        destination: { city: destinationCity, state: destinationState, zip3: destinationZip3 },
        equipmentCode,
      },
    });
  } catch (err) {
    console.error('[PAIRING] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
