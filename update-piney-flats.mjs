import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const HERE_API_KEY = process.env.HERE_API_KEY;

async function geocodeCity(city, state) {
  try {
    const query = `${city}, ${state}`;
    const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(query)}&apiKey=${HERE_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log('HERE API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    const position = data.items?.[0]?.position;
    
    if (position?.lat && position?.lng) {
      return { 
        latitude: position.lat, 
        longitude: position.lng 
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

async function main() {
  console.log('Checking for Piney Flats, TN...');
  
  const { data: city, error } = await supabase
    .from('cities')
    .select('*')
    .eq('city', 'Piney Flats')
    .eq('state_or_province', 'TN')
    .maybeSingle();
  
  if (error) {
    console.error('Error querying:', error);
    return;
  }
  
  if (!city) {
    console.log('Piney Flats, TN not found in database');
    return;
  }
  
  console.log('Found city:', city);
  
  if (city.latitude && city.longitude) {
    console.log('✅ City already has coordinates:', city.latitude, city.longitude);
    return;
  }
  
  console.log('Geocoding Piney Flats, TN...');
  const coords = await geocodeCity('Piney Flats', 'TN');
  
  if (!coords) {
    console.log('❌ Failed to geocode city');
    return;
  }
  
  console.log('Got coordinates:', coords);
  
  const { error: updateError } = await supabase
    .from('cities')
    .update({
      latitude: coords.latitude,
      longitude: coords.longitude
    })
    .eq('id', city.id);
  
  if (updateError) {
    console.error('Error updating:', updateError);
    return;
  }
  
  console.log('✅ Successfully updated Piney Flats, TN with coordinates');
}

main().catch(console.error);
