// pages/api/kmaOptions.js
// API endpoint to get KMA options for a specific state

import { adminSupabase as supabase } from '../../utils/supabaseClient.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { state } = req.query;

  if (!state) {
    return res.status(400).json({ error: 'State parameter is required' });
  }

  try {
    // Get unique KMA codes and names for the specified state
    const { data, error } = await supabase
      .from('cities')
      .select('kma_code, kma_name')
      .eq('state_or_province', state.toUpperCase())
      .not('kma_code', 'is', null)
      .not('kma_name', 'is', null);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch KMA options' });
    }

    // Remove duplicates and sort
    const uniqueKmas = [];
    const seen = new Set();

    data.forEach(row => {
      const key = `${row.kma_code}_${row.kma_name}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueKmas.push({
          code: row.kma_code,
          name: row.kma_name
        });
      }
    });

    // Sort by KMA code
    uniqueKmas.sort((a, b) => a.code.localeCompare(b.code));

    res.status(200).json(uniqueKmas);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
