// pages/api/cities.js
// GET /api/cities?q=City[, ST]
// Returns up to 12 suggestions { id, city, state, zip, label }.
// Tolerant of state_or_province|state and zip|postal_code; accepts "City, ST" or free text.

import { adminSupabase } from '../../utils/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const q = String(req.query.q || '').trim();
  if (!q) return res.status(200).json([]);

  try {
    // Parse "City, ST" if present
    let cityQ = q;
    let stateQ = null;
    const parts = q.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2 && parts[1].length <= 3) {
      cityQ = parts[0];
      stateQ = parts[1];
    }

    let query = adminSupabase
      .from('cities')
      .select('id, city, state_or_province, zip, postal_code')
      .ilike('city', `${cityQ}%`)
      .limit(50);

    if (stateQ) {
      query = query.ilike('state_or_province', `${stateQ}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const out = (data || [])
      .slice(0, 12)
      .map((c) => {
        const state = c.state_or_province;
        const zip = c.zip || c.postal_code || '';
        return {
          id: c.id,
          city: c.city,
          state,
          zip,
          label: zip ? `${c.city}, ${state} ${zip}` : `${c.city}, ${state}`,
        };
      });

    return res.status(200).json(out);
  } catch (err) {
    console.error('GET /api/cities error:', err);
    return res.status(500).json({ error: 'Failed to search cities' });
  }
}
