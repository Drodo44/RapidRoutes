// API endpoint for exporting purged cities as CSV for DAT submission
// GET: Generate CSV download of purged cities

import { adminSupabase as supabase } from '../../../utils/supabaseAdminClient.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { status = 'pending', format = 'csv' } = req.query;

    // Fetch purged cities based on status
    let query = supabase
      .from('purged_cities')
      .select('*')
      .order('purged_date', { ascending: false });

    if (status !== 'all') {
      query = query.eq('dat_submission_status', status);
    }

    const { data: purgedCities, error } = await query;

    if (error) {
      console.error('❌ Error fetching purged cities for export:', error);
      return res.status(500).json({ error: error.message });
    }

    if (format === 'csv') {
      // Generate CSV content
      const csvHeaders = [
        'City',
        'State',
        'ZIP',
        'Original KMA Code',
        'Original KMA Name',
        'Latitude',
        'Longitude',
        'Purged Date',
        'Purge Reason',
        'Submission Status',
        'Submission Date',
        'DAT Response'
      ];

      const csvRows = [csvHeaders.join(',')];

      for (const city of purgedCities) {
        const row = [
          escapeCSV(city.city),
          escapeCSV(city.state_or_province),
          escapeCSV(city.zip || ''),
          escapeCSV(city.original_kma_code || ''),
          escapeCSV(city.original_kma_name || ''),
          city.latitude || '',
          city.longitude || '',
          new Date(city.purged_date).toISOString().split('T')[0],
          escapeCSV(city.purge_reason),
          escapeCSV(city.dat_submission_status),
          city.dat_submission_date ? new Date(city.dat_submission_date).toISOString().split('T')[0] : '',
          escapeCSV(city.dat_response || '')
        ];
        csvRows.push(row.join(','));
      }

      const csvContent = csvRows.join('\n');
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `purged-cities-${status}-${timestamp}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csvContent);

    } else if (format === 'json') {
      // Return JSON format
      return res.status(200).json({
        cities: purgedCities,
        count: purgedCities.length,
        status: status,
        exported_at: new Date().toISOString()
      });

    } else {
      return res.status(400).json({ error: 'Invalid format. Supported: csv, json' });
    }

  } catch (error) {
    console.error('❌ Export purged cities API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// Helper function to escape CSV values
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  
  const stringValue = String(value);
  
  // If the value contains comma, quotes, or newlines, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}
