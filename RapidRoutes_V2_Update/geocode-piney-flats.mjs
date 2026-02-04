import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const HERE_API_KEY = process.env.HERE_API_KEY;

async function geocode() {
  const query = 'Piney Flats, TN 37686';
  const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(query)}&apiKey=${HERE_API_KEY}`;
  
  console.log('Geocoding:', query);
  const response = await fetch(url);
  const data = await response.json();
  
  console.log('HERE API response:', JSON.stringify(data, null, 2));
  
  const position = data.items?.[0]?.position;
  
  if (position?.lat && position?.lng) {
    console.log('Got coordinates:', position.lat, position.lng);
    
    const { error } = await supabase
      .from('cities')
      .update({
        latitude: position.lat,
        longitude: position.lng
      })
      .eq('city', 'Piney Flats')
      .eq('state_or_province', 'TN');
    
    if (error) {
      console.error('Update error:', error);
    } else {
      console.log('✅ Updated Piney Flats with coordinates');
    }
  } else {
    console.log('❌ No coordinates found');
  }
}

geocode().catch(console.error);
