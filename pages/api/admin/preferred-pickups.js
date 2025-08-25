// pages/api/admin/preferred-pickups.js
// API for managing broker's preferred pickup locations

import { adminSupabase } from '../../../utils/supabaseClient';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Get all preferred pickups
      const { data, error } = await adminSupabase
        .from('preferred_pickups')
        .select('*')
        .order('frequency_score', { ascending: false });
      
      if (error) throw error;
      
      res.status(200).json(data);
      
    } else if (req.method === 'POST') {
      // Add new preferred pickup
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
      // Update preferred pickup
      const { id, ...updates } = req.body;
      
      const { data, error } = await adminSupabase
        .from('preferred_pickups')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      res.status(200).json(data);
      
    } else if (req.method === 'DELETE') {
      // Delete preferred pickup
      const { id } = req.query;
      
      const { error } = await adminSupabase
        .from('preferred_pickups')
        .delete()
        .eq('id', id);
      
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
