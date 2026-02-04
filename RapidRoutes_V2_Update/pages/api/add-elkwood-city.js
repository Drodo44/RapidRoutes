// pages/api/add-elkwood-city.js
// Emergency endpoint to add Elkwood, VA to cities table
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if Elkwood, VA exists
    const { data: existing } = await supabaseAdmin
      .from('cities')
      .select('*')
      .ilike('city', 'elkwood')
      .eq('state_or_province', 'VA')
      .maybeSingle();

    if (existing) {
      // Check if coordinates are correct
      const needsUpdate = !existing.latitude || !existing.longitude ||
                          existing.latitude < 36.5 || existing.latitude > 39.5 ||
                          existing.longitude > -75 || existing.longitude < -83.5;

      if (needsUpdate) {
        const { error: updateError } = await supabaseAdmin
          .from('cities')
          .update({
            latitude: 38.5124,
            longitude: -77.8549,
            zip: '22718',
            kma_code: 'VA_ALE',
            kma_name: 'Alexandria'
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;

        return res.status(200).json({
          message: 'Updated Elkwood, VA with correct coordinates',
          action: 'updated',
          city: {
            city: 'Elkwood',
            state: 'VA',
            latitude: 38.5124,
            longitude: -77.8549,
            zip: '22718',
            kma_code: 'VA_ALE'
          }
        });
      }

      return res.status(200).json({
        message: 'Elkwood, VA already exists with correct coordinates',
        action: 'none',
        city: existing
      });
    }

    // Add Elkwood, VA to cities table
    const { data: newCity, error: insertError } = await supabaseAdmin
      .from('cities')
      .insert([{
        city: 'Elkwood',
        state_or_province: 'VA',
        zip: '22718',
        latitude: 38.5124,
        longitude: -77.8549,
        kma_code: 'VA_ALE',
        kma_name: 'Alexandria'
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    return res.status(201).json({
      message: 'Successfully added Elkwood, VA to cities table',
      action: 'inserted',
      city: newCity
    });

  } catch (error) {
    console.error('Add Elkwood city error:', error);
    return res.status(500).json({ error: error.message });
  }
}
