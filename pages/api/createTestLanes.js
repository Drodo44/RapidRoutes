// pages/api/createTestLanes.js
// Create test lanes to populate dashboard stats

import { adminSupabase } from '../../utils/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const testLanes = [
      {
        origin_city: 'Atlanta',
        origin_state: 'GA',
        dest_city: 'Miami',
        dest_state: 'FL',
        equipment_code: 'V',
        weight_lbs: 45000,
        length_ft: 53,
        pickup_earliest: '2025-08-26',
        pickup_latest: '2025-08-27',
        full_partial: 'Full',
        status: 'pending',
        commodity: 'General Freight',
        comment: 'Test lane for dashboard stats'
      },
      {
        origin_city: 'Dallas',
        origin_state: 'TX',
        dest_city: 'Chicago',
        dest_state: 'IL',
        equipment_code: 'FD',
        weight_lbs: 35000,
        length_ft: 48,
        pickup_earliest: '2025-08-27',
        pickup_latest: '2025-08-28',
        full_partial: 'Full',
        status: 'posted',
        commodity: 'Steel',
        comment: 'Test lane - already posted'
      },
      {
        origin_city: 'Phoenix',
        origin_state: 'AZ',
        dest_city: 'Seattle',
        dest_state: 'WA',
        equipment_code: 'R',
        weight_lbs: 42000,
        length_ft: 53,
        pickup_earliest: '2025-08-28',
        pickup_latest: '2025-08-29',
        full_partial: 'Full',
        status: 'covered',
        commodity: 'Produce',
        comment: 'Test lane - covered'
      },
      {
        origin_city: 'Denver',
        origin_state: 'CO',
        dest_city: 'Kansas City',
        dest_state: 'MO',
        equipment_code: 'V',
        weight_lbs: 38000,
        length_ft: 53,
        pickup_earliest: '2025-08-29',
        pickup_latest: '2025-08-30',
        full_partial: 'Full',
        status: 'pending',
        commodity: 'Electronics',
        comment: 'Test lane pending'
      },
      {
        origin_city: 'Los Angeles',
        origin_state: 'CA',
        dest_city: 'Las Vegas',
        dest_state: 'NV',
        equipment_code: 'FD',
        weight_lbs: 25000,
        length_ft: 48,
        pickup_earliest: '2025-08-30',
        pickup_latest: '2025-08-31',
        full_partial: 'Partial',
        status: 'posted',
        commodity: 'Construction Materials',
        comment: 'Test lane for stats'
      }
    ];

    const { data, error } = await adminSupabase
      .from('lanes')
      .insert(testLanes)
      .select();

    if (error) {
      throw error;
    }

    // Also create some test recap tracking data
    const recapData = [
      {
        lane_id: data[0]?.id,
        lane_posting_id: 'test-posting-1',
        action_type: 'email',
        pickup_distance_miles: 15.5,
        delivery_distance_miles: 22.3,
        notes: 'Test email tracking'
      },
      {
        lane_id: data[1]?.id,
        lane_posting_id: 'test-posting-2',
        action_type: 'call',
        pickup_distance_miles: 8.2,
        delivery_distance_miles: 45.1,
        notes: 'Test call tracking'
      },
      {
        lane_id: data[2]?.id,
        lane_posting_id: 'test-posting-3',
        action_type: 'covered',
        pickup_distance_miles: 12.7,
        delivery_distance_miles: 33.9,
        notes: 'Test covered tracking'
      }
    ];

    await adminSupabase
      .from('recap_tracking')
      .insert(recapData);

    return res.status(200).json({
      success: true,
      lanesCreated: data.length,
      recapEntriesCreated: recapData.length,
      message: 'Test lanes and recap data created successfully'
    });

  } catch (error) {
    console.error('Error creating test lanes:', error);
    return res.status(500).json({ error: error.message });
  }
}
