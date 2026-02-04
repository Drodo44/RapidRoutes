// API endpoint for restoring a city from purged_cities back to cities table
// POST: Move city from purged_cities to cities table

import { restoreCityFromPurged } from '../../../lib/hereVerificationService.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { purgedCityId, restoredBy } = req.body;

    if (!purgedCityId) {
      return res.status(400).json({ error: 'purgedCityId is required' });
    }

    console.log(`🔄 Restoring purged city ID: ${purgedCityId}${restoredBy ? ` by ${restoredBy}` : ''}`);

    // Restore the city
    const success = await restoreCityFromPurged(purgedCityId);

    if (success) {
      return res.status(200).json({ 
        message: 'City successfully restored to active cities table',
        purged_city_id: purgedCityId,
        restored_by: restoredBy || null
      });
    } else {
      return res.status(500).json({ error: 'Failed to restore city' });
    }

  } catch (error) {
    console.error('❌ Restore city API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
