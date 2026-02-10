// lib/trafficService.js
// Fetches traffic incidents using HERE API

export async function getTrafficIncidents(lat, lng) {
  const API_KEY = process.env.HERE_API_KEY || process.env.NEXT_PUBLIC_HERE_API_KEY;
  if (!API_KEY) {
    console.warn('HERE API Key missing');
    return [];
  }

  try {
    const radius = 5000; // 5km
    const url = `https://traffic.ls.hereapi.com/traffic/6.3/incidents.json?apiKey=${API_KEY}&prox=${lat},${lng},${radius}`;

    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();

    // Normalize HERE API response to a simpler format
    if (data.TRAFFIC_ITEMS && data.TRAFFIC_ITEMS.TRAFFIC_ITEM) {
        return data.TRAFFIC_ITEMS.TRAFFIC_ITEM.map(item => ({
            type: item.TRAFFIC_ITEM_TYPE_DESC,
            description: item.TRAFFIC_ITEM_DESCRIPTION[0].value,
            criticality: item.CRITICALITY.DESCRIPTION,
            delay: item.DELAY_MINUTES
        }));
    }

    return [];
  } catch (error) {
    console.error('Traffic API Error:', error);
    return [];
  }
}
