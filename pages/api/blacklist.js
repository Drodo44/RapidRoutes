// pages/api/blacklist.js
// API for managing blacklisted cities
import { adminSupabase } from '@/utils/supabaseClient';

export default async function handler(req, res) {
  try {
    const { method } = req;

    switch (method) {
      case 'GET':
        // Get all blacklisted cities
        const { data: blacklist, error: getError } = await adminSupabase
          .from('blacklisted_cities')
          .select('*')
          .order('city', { ascending: true });

        if (getError) throw getError;

        return res.status(200).json({ blacklist: blacklist || [] });

      case 'POST':
        // Add city to blacklist
        const { city, state, reason } = req.body;

        if (!city || !state) {
          return res.status(400).json({ error: 'City and state are required' });
        }

        const normalizedCity = city.trim().toUpperCase();
        const normalizedState = state.trim().toUpperCase();

        // Check if already blacklisted
        const { data: existing } = await adminSupabase
          .from('blacklisted_cities')
          .select('id')
          .eq('city', normalizedCity)
          .eq('state', normalizedState)
          .maybeSingle();

        if (existing) {
          return res.status(409).json({ error: 'City already blacklisted' });
        }

        const { data: newEntry, error: insertError } = await adminSupabase
          .from('blacklisted_cities')
          .insert([{
            city: normalizedCity,
            state: normalizedState,
            reason: reason || 'User blacklisted'
          }])
          .select()
          .single();

        if (insertError) throw insertError;

        return res.status(201).json({ success: true, entry: newEntry });

      case 'DELETE':
        // Remove city from blacklist
        const { id, city: delCity, state: delState } = req.query;

        let deleteQuery = adminSupabase.from('blacklisted_cities').delete();

        if (id) {
          deleteQuery = deleteQuery.eq('id', id);
        } else if (delCity && delState) {
          deleteQuery = deleteQuery
            .eq('city', delCity.trim().toUpperCase())
            .eq('state', delState.trim().toUpperCase());
        } else {
          return res.status(400).json({ error: 'Must provide id or city+state' });
        }

        const { error: deleteError } = await deleteQuery;

        if (deleteError) throw deleteError;

        return res.status(200).json({ success: true });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Blacklist API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
