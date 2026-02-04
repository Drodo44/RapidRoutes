// API endpoint for manually verifying a single city with HERE.com
// POST: Verify city and optionally update database

import { verifyCityWithHERE } from '../../../lib/hereVerificationService.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Lazy import admin client to avoid bundling in client
  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
  } catch (e) {
    console.error('[verify-city] Admin client import failed:', e?.message || e);
    return res.status(500).json({ error: 'Server configuration error: admin client unavailable' });
  }

  try {
    const { city, state, zip, updateDatabase = false, verifiedBy } = req.body;

    if (!city || !state) {
      return res.status(400).json({ error: 'City and state are required' });
    }

  const zipPart = zip ? ` ${zip}` : '';
  console.log(`🔍 Manual verification request: ${city}, ${state}${zipPart}`);

    // Perform HERE.com verification
    const verification = await verifyCityWithHERE(city, state, zip, 'manual', verifiedBy);

    // If updateDatabase is true, update the city's verification status
    if (updateDatabase && verification.verified) {
      const { data, error } = await supabaseAdmin
        .from('cities')
        .update({ here_verified: true })
        .eq('city', city)
        .ilike('state_or_province', state)
        .select('*');

      if (error) {
        console.error('❌ Error updating city verification status:', error);
        return res.status(500).json({
          verification,
          database_update: { error: error.message }
        });
      }

      console.log(`✅ Updated verification status for ${data.length} matching cities`);
      return res.status(200).json({
        verification,
        database_update: {
          success: true,
          updated_cities: data
        }
      });
    }

    return res.status(200).json({ verification });

  } catch (error) {
    console.error('❌ City verification API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
