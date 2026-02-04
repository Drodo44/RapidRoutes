// pages/api/admin/fix-bristol-zip3.js
// One-time fix to add ZIP3 190 and update Bristol, PA coordinates

import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔧 Adding ZIP3 190 (Bristol, PA area) to zip3_kma_geo table...');
    
    // Philadelphia coordinates (approximate center of the metro area)
    const philadelphiaLat = 39.9526;
    const philadelphiaLon = -75.1652;
    const kmaCode = 'PHL';
    
    // Check if ZIP3 190 already exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('zip3_kma_geo')
      .select('*')
      .eq('zip3', '190')
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking for existing ZIP3:', checkError);
      return res.status(500).json({ error: 'Database check failed', details: checkError });
    }
    
    let zip3Result = existing;
    
    if (!existing) {
      // Insert ZIP3 190
      console.log('📝 Inserting ZIP3 190 into zip3_kma_geo...');
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('zip3_kma_geo')
        .insert([
          {
            zip3: '190',
            latitude: philadelphiaLat,
            longitude: philadelphiaLon,
            kma_code: kmaCode
          }
        ])
        .select()
        .single();
      
      if (insertError) {
        console.error('Error inserting ZIP3:', insertError);
        return res.status(500).json({ error: 'Failed to insert ZIP3', details: insertError });
      }
      
      zip3Result = inserted;
      console.log('✅ Successfully added ZIP3 190');
    } else {
      console.log('✅ ZIP3 190 already exists');
    }
    
    // Update Bristol city record with coordinates
    console.log('📍 Updating Bristol, PA city record with coordinates...');
    const { data: bristolUpdate, error: updateError } = await supabaseAdmin
      .from('cities')
      .update({ 
        latitude: philadelphiaLat, 
        longitude: philadelphiaLon 
      })
      .eq('city', 'Bristol')
      .eq('state_or_province', 'PA')
      .select();
    
    if (updateError) {
      console.error('Error updating Bristol city:', updateError);
      return res.status(500).json({ 
        error: 'Failed to update Bristol city', 
        details: updateError,
        zip3Added: !!zip3Result 
      });
    }
    
    console.log('✅ Updated Bristol city with coordinates');
    
    return res.status(200).json({
      success: true,
      message: 'Bristol, PA fix complete',
      zip3: zip3Result,
      bristolCity: bristolUpdate
    });
    
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
