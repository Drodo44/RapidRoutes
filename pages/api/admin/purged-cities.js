// API endpoint for managing purged cities
// GET: List purged cities with filtering and pagination
// POST: Update DAT submission status for cities

import { adminSupabase as supabase } from '../../../utils/supabaseClient.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { 
        page = 1, 
        limit = 50, 
        search = '', 
        state = '', 
        status = '', 
        dateFrom = '', 
        dateTo = '',
        sortBy = 'purged_date',
        sortOrder = 'desc'
      } = req.query;

      let query = supabase
        .from('purged_cities')
        .select('*', { count: 'exact' });

      // Apply filters
      if (search) {
        query = query.or(`city.ilike.%${search}%, state_or_province.ilike.%${search}%, original_kma_code.ilike.%${search}%`);
      }

      if (state) {
        query = query.eq('state_or_province', state);
      }

      if (status) {
        query = query.eq('dat_submission_status', status);
      }

      if (dateFrom) {
        query = query.gte('purged_date', dateFrom);
      }

      if (dateTo) {
        query = query.lte('purged_date', dateTo);
      }

      // Apply sorting
      const ascending = sortOrder === 'asc';
      query = query.order(sortBy, { ascending });

      // Apply pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query = query.range(offset, offset + parseInt(limit) - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Error fetching purged cities:', error);
        return res.status(500).json({ error: error.message });
      }

      // Get statistics
      const { data: stats, error: statsError } = await supabase
        .from('purged_cities_stats')
        .select('*')
        .single();

      if (statsError) {
        console.error('❌ Error fetching stats:', statsError);
      }

      return res.status(200).json({
        cities: data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / parseInt(limit))
        },
        statistics: stats || null
      });

    } else if (req.method === 'POST') {
      const { action, cityIds, status, response } = req.body;

      if (!action || !cityIds || !Array.isArray(cityIds)) {
        return res.status(400).json({ error: 'Invalid request body. Required: action, cityIds array' });
      }

      let updateData = {};

      switch (action) {
        case 'mark_submitted':
          updateData = {
            dat_submission_status: 'submitted',
            dat_submission_date: new Date().toISOString()
          };
          break;

        case 'mark_approved':
          updateData = {
            dat_submission_status: 'approved',
            dat_response: response || 'Approved by DAT'
          };
          break;

        case 'mark_rejected':
          updateData = {
            dat_submission_status: 'rejected',
            dat_response: response || 'Rejected by DAT'
          };
          break;

        case 'update_status':
          if (!status) {
            return res.status(400).json({ error: 'Status is required for update_status action' });
          }
          updateData = {
            dat_submission_status: status,
            dat_response: response || null
          };
          if (status === 'submitted') {
            updateData.dat_submission_date = new Date().toISOString();
          }
          break;

        default:
          return res.status(400).json({ error: 'Invalid action. Supported: mark_submitted, mark_approved, mark_rejected, update_status' });
      }

      const { data, error } = await supabase
        .from('purged_cities')
        .update(updateData)
        .in('id', cityIds)
        .select('*');

      if (error) {
        console.error('❌ Error updating purged cities:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log(`✅ Updated ${data.length} cities with action: ${action}`);
      return res.status(200).json({ 
        message: `Successfully updated ${data.length} cities`,
        updated_cities: data
      });

    } else if (req.method === 'DELETE') {
      const { cityIds } = req.body;

      if (!cityIds || !Array.isArray(cityIds)) {
        return res.status(400).json({ error: 'cityIds array is required' });
      }

      const { data, error } = await supabase
        .from('purged_cities')
        .delete()
        .in('id', cityIds)
        .select('*');

      if (error) {
        console.error('❌ Error deleting purged cities:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log(`🗑️ Deleted ${data.length} purged cities`);
      return res.status(200).json({ 
        message: `Successfully deleted ${data.length} cities`,
        deleted_cities: data
      });

    } else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

  } catch (error) {
    console.error('❌ Purged cities API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
