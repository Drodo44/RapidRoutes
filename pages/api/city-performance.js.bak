// pages/api/city-performance.js
// Smart City Learning API - Track coverage success by city and method

import { getServerSupabase } from '../../lib/supabaseClient.js';

export default async function handler(req, res) {
  const supabase = getServerSupabase();

  if (req.method === 'POST') {
    // Record a coverage event
    try {
      const { city, state, kma, coverageSource, rrNumber, laneGroupId } = req.body;

      if (!city || !state || !coverageSource) {
        return res.status(400).json({ error: 'Missing required fields: city, state, coverageSource' });
      }

      // Validate coverage source
      const validSources = ['IBC', 'OBC', 'Email'];
      if (!validSources.includes(coverageSource)) {
        return res.status(400).json({ error: 'Invalid coverageSource. Must be IBC, OBC, or Email' });
      }

      // Upsert city performance record
      const { data: existing, error: fetchError } = await supabase
        .from('city_performance')
        .select('*')
        .eq('city', city)
        .eq('state', state)
        .single();

      let updatedData;
      
      if (existing) {
        // Update existing record
        const newIBC = existing.covers_ibc + (coverageSource === 'IBC' ? 1 : 0);
        const newOBC = existing.covers_obc + (coverageSource === 'OBC' ? 1 : 0);
        const newEmail = existing.covers_email + (coverageSource === 'Email' ? 1 : 0);
        const newTotal = existing.covers_total + 1;
        
        // Auto-star if >= 5 IBCs or >= 10 total
        const isStarred = newIBC >= 5 || newTotal >= 10;

        const { data, error } = await supabase
          .from('city_performance')
          .update({
            kma: kma || existing.kma,
            covers_total: newTotal,
            covers_ibc: newIBC,
            covers_obc: newOBC,
            covers_email: newEmail,
            last_success: new Date().toISOString(),
            is_starred: isStarred,
            updated_at: new Date().toISOString()
          })
          .eq('city', city)
          .eq('state', state)
          .select()
          .single();

        if (error) throw error;
        updatedData = data;
      } else {
        // Insert new record
        const isStarred = coverageSource === 'IBC' ? false : false; // Will be starred after 5 IBCs

        const { data, error } = await supabase
          .from('city_performance')
          .insert({
            city,
            state,
            kma: kma || null,
            covers_total: 1,
            covers_ibc: coverageSource === 'IBC' ? 1 : 0,
            covers_obc: coverageSource === 'OBC' ? 1 : 0,
            covers_email: coverageSource === 'Email' ? 1 : 0,
            last_success: new Date().toISOString(),
            is_starred: isStarred
          })
          .select()
          .single();

        if (error) throw error;
        updatedData = data;
      }

      // Update the lane record with coverage info
      if (rrNumber) {
        const { error: laneError } = await supabase
          .from('lanes')
          .update({
            lane_status: 'covered',
            coverage_source: coverageSource,
            updated_at: new Date().toISOString()
          })
          .eq('rr_number', rrNumber);

        if (laneError) {
          console.error('Error updating lane status:', laneError);
        }
      }

      // If laneGroupId provided, mark all lanes in group as covered
      if (laneGroupId) {
        const { error: groupError } = await supabase
          .from('lanes')
          .update({
            lane_status: 'covered',
            updated_at: new Date().toISOString()
          })
          .eq('lane_group_id', laneGroupId);

        if (groupError) {
          console.error('Error updating lane group:', groupError);
        }
      }

      return res.status(200).json({
        success: true,
        cityPerformance: updatedData,
        message: `Coverage recorded: ${city}, ${state} via ${coverageSource}`
      });

    } catch (error) {
      console.error('Error recording city performance:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'GET') {
    // Get starred cities or all city performance data
    try {
      const { starred, city, state } = req.query;

      let query = supabase.from('city_performance').select('*');

      if (starred === 'true') {
        query = query.eq('is_starred', true);
      }

      if (city) {
        query = query.ilike('city', `%${city}%`);
      }

      if (state) {
        query = query.eq('state', state);
      }

      query = query.order('covers_total', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return res.status(200).json({ success: true, data });

    } catch (error) {
      console.error('Error fetching city performance:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
