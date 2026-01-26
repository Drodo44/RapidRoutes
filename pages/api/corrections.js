// pages/api/corrections.js
// API endpoint to manage city name corrections

import supabaseAdmin from '@/lib/supabaseAdmin';
import { getUserOrganizationId } from '@/lib/organizationHelper';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Fetch all corrections
      const { data, error } = await supabaseAdmin
        .from('city_corrections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return res.status(200).json({ corrections: data || [] });
    }

    if (req.method === 'POST') {
      // Add new correction
  const { incorrect_city, incorrect_state, correct_city, correct_state, notes, userId } = req.body;

      if (!incorrect_city || !incorrect_state || !correct_city || !correct_state) {
        return res.status(400).json({ error: 'All city and state fields are required' });
      }
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      // Get user's organization_id
      const organizationId = await getUserOrganizationId(userId);
      if (!organizationId) {
        return res.status(500).json({ error: 'User profile not properly configured' });
      }

      const { data, error } = await supabaseAdmin
        .from('city_corrections')
        .insert({
          incorrect_city: incorrect_city.trim(),
          incorrect_state: incorrect_state.trim().toUpperCase(),
          correct_city: correct_city.trim(),
          correct_state: correct_state.trim().toUpperCase(),
          notes: notes?.trim() || null,
          created_by: userId,
          organization_id: organizationId
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({ error: 'This correction already exists' });
        }
        throw error;
      }

      return res.status(201).json({ correction: data });
    }

    if (req.method === 'DELETE') {
      // Remove correction
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Correction ID is required' });
      }

      const { error } = await supabaseAdmin
        .from('city_corrections')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({ message: 'Correction removed successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Corrections API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
