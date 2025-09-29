// pages/api/preferred-pickups.js
// API for managing user's personal preferred pickup locations

import { adminSupabase } from '../../utils/supabaseAdminClient';
import supabase from '../../utils/supabaseClient';

export default async function handler(req, res) {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = user.id;

    if (req.method === 'GET') {
      // Get user's preferred pickups only
      const { data, error } = await adminSupabase
        .from('preferred_pickups')
        .select('*')
        .eq('user_id', userId)
        .order('frequency_score', { ascending: false });
      
      if (error) throw error;
      
      res.status(200).json(data);
      
    } else if (req.method === 'POST') {
      // Add new preferred pickup for current user
      const { city, state, zip, frequency_score, equipment_preference, notes } = req.body;
      
      // Look up KMA info from cities table
      const { data: cityData } = await adminSupabase
        .from('cities')
        .select('kma_code, kma_name')
        .ilike('city', city)
        .ilike('state_or_province', state)
        .limit(1);
      
      const kma_code = cityData?.[0]?.kma_code || null;
      const kma_name = cityData?.[0]?.kma_name || null;
      
      const { data, error } = await adminSupabase
        .from('preferred_pickups')
        .insert([{
          user_id: userId,
          city,
          state_or_province: state,
          zip,
          kma_code,
          kma_name,
          frequency_score: frequency_score || 1,
          equipment_preference: equipment_preference || [],
          notes: notes || ''
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      res.status(201).json(data);
      
    } else if (req.method === 'PUT') {
      // Update user's preferred pickup
      const { id, ...updates } = req.body;
      
      // Ensure user can only update their own pickups
      const { data, error } = await adminSupabase
        .from('preferred_pickups')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      
      res.status(200).json(data);
      
    } else if (req.method === 'DELETE') {
      // Delete user's preferred pickup
      const { id } = req.query;
      
      // Ensure user can only delete their own pickups
      const { error } = await adminSupabase
        .from('preferred_pickups')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      res.status(200).json({ message: 'Preferred pickup deleted' });
      
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('Preferred pickups API error:', error);
    res.status(500).json({ error: error.message });
  }
}
