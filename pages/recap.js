import { useState, useEffect } from 'react';
import supabase from '../utils/supabaseClient';
import dynamic from 'next/dynamic';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then(mod => mod.Circle), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });

function haversine(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export default function Recap() {
  const [lanes, setLanes] = useState([]);
  const [selectedLane, setSelectedLane] = useState(null);
  const [search, setSearch] = useState('');
  const [filteredResults, setFilteredResults] = useState([]);
  const [crawlCities, setCrawlCities] = useState({ pickups: [], deliveries: [] });
  const [weather, setWeather] = useState({ pickup: null, delivery: null });
  const [marketRisk, setMarketRisk] = useState('');
  const [aiNotes, setAiNotes] = useState('');

  useEffect(() => {
    supabase.from('lanes').select('*').eq('status', 'Active').order('created_at', { ascending: false })
      .then(({ data }) => setLanes(data || []));
  }, []);

  useEffect(() => {
    if (!search.trim()) return setFilteredResults([]);
    const term = search.toLowerCase();
    setFilteredResults(lanes.filter(l =>
      l.origin_city.toLowerCase().includes(term) ||
      l.dest_city.toLowerCase().includes(term) ||
      (l.id && l.id.toString().includes(term))
    ).slice(0, 10));
  }, [search, lanes]);

  const fetchWeather = async (lane) => {
    const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
    const fetchCity = async (city, state) => {
      try {
        const resp = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city},${state},US&appid=${apiKey}&units=imperial`);
        if (!resp.ok) return null;
        const d = await resp.json();
        return { temp: d.main.temp, conditions: d.weather[0].description };
      } catch { return null; }
    };
    const pickupWeather = await fetchCity(lane.origin_city, lane.origin_state);
    const deliveryWeather = await fetchCity(lane.dest_city, lane.dest_state);
    setWeather({ pickup: pickupWeather, delivery: deliveryWeather });
  };

  const fetchCrawlCities = async (lane) => {
    const { data: pickups } = await supabase.from('cities').select('city,state_or_province,latitude,longitude')
      .neq('zip', lane.origin_zip).ilike('state_or_province', lane.origin_state).limit(10);
    const { data: deliveries } = await supabase.from('cities').select('city,state_or_province,latitude,longitude')
      .neq('zip', lane.dest_zip).ilike('state_or_province', lane.dest_state).limit(10);
    if (pickups && deliveries) {
      const pickupMiles = pickups.map(c => ({ ...c, miles: haversine(lane.origin_lat, lane.origin_lon, c.latitude, c.longitude) }));
      const deliveryMiles = deliveries.map(c => ({ ...c, miles: haversine(lane.dest_lat, lane.dest_lon, c.latitude, c.longitude) }));
      setCrawlCities({ pickups: pickupMiles, deliveries: deliveryMiles });
    }
  };

  const generateAiInsights = () => {
    const risks = ['Stable', 'Volatile', 'High Demand', 'Low Demand'];
    const r = risks[Math.floor(Math.random() * risks.length)];
    setMarketRisk(r);
    const notes = {
      Stable: "Market stable. Normal call volume.",
      Volatile: "Rates moving fast — watch trends.",
      "High Demand": "Strong calls expected. Can quote higher.",
      "Low Demand": "Quiet market. Sharpen rates to move freight."
    };
    setAiNotes(notes[r]);
  };

  const handleSelectLane = (lane) => {
    setSelectedLane(lane); setSearch(''); setFilteredResults([]);
    fetchWeather(lane); fetchCrawlCities(lane); generateAiInsights();
  };

  const exportCsv = () => { window.location.href = '/api/exportDatCsv'; };
  const exportHtml = () => {
    const html = document.documentElement.outerHTML;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'Active_Postings_Recap.html'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-cyan-400">Active Postings Recap</h1>
        <button onClick={exportCsv} className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl shadow-lg">
          Export DAT CSV
        </button>
      </div>

      <div className="relative mb-6">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by city, ZIP, or Lane ID..." className="w-full p-3 rounded-lg bg-gray-900 text-white" />
        {filteredResults.length > 0 && (
          <ul className="absolute z-10 bg-gray-800 text-white w-full mt-1 rounded-lg max-h-64 overflow-auto shadow-lg">
            {filteredResults.map((lane) => (
              <li key={lane.id} onClick={() => handleSelectLane(lane)}
                className="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700">
                <div className="font-bold">{lane.origin_city}, {lane.origin_state} → {lane.dest_city}, {lane.dest_state}</div>
                <div className="text-sm text-gray-400">
                  {lane.equipment} • {lane.weight} lbs • Posted {new Date(lane.created_at).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedLane && (
        <div className="bg-gray-900 p-4 rounded-2xl mb-6 shadow-lg">
          <h2 className="text-xl text-emerald-400 mb-2">{selectedLane.origin_city}, {selectedLane.origin_state} → {selectedLane.dest_city}, {selectedLane.dest_state}</h2>
          <p className="text-gray-300">Equipment: {selectedLane.equipment} | Weight: {selectedLane.weight} lbs | Length: {selectedLane.length} ft</p>
          <p className="text-gray-400">Posted {new Date(selectedLane.created_at).toLocaleDateString()}</p>
          {weather.pickup && <p className="mt-2 text-gray-300">Pickup Weather: {weather.pickup.temp}°F, {weather.pickup.conditions}</p>}
          {weather.delivery && <p className="text-gray-300">Delivery Weather: {weather.delivery.temp}°F, {weather.delivery.conditions}</p>}
          <p className="mt-2 text-yellow-400">Market Condition: {marketRisk}</p>
          <p className="text-cyan-300 mt-1">{aiNotes}</p>

          <div className="mt-4">
            <p className="font-bold text-emerald-400">Pickup Market Options (from {selectedLane.origin_city}):</p>
            <ul className="list-disc list-inside text-gray-300">
              {crawlCities.pickups.map((c, i) => <li key={i}>{c.city}, {c.state_or_province} – {c.miles} miles</li>)}
            </ul>
            <p className="font-bold text-emerald-400 mt-4">Delivery Market Options (from {selectedLane.dest_city}):</p>
            <ul className="list-disc list-inside text-gray-300">
              {crawlCities.deliveries.map((c, i) => <li key={i}>{c.city}, {c.state_or_province} – {c.miles} miles</li>)}
            </ul>
          </div>

          <div className="flex space-x-4 mt-4">
            <button onClick={exportHtml} className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-xl shadow-lg">
              Download Recap
            </button>
            <button onClick={exportCsv} className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-xl shadow-lg">
              Export DAT CSV
            </button>
          </div>
        </div>
      )}

      <div className="bg-gray-900 p-4 rounded-2xl shadow-lg">
        <MapContainer center={[39.5, -98.35]} zoom={4} style={{ height: '500px', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {selectedLane && (
            <>
              <Marker position={[selectedLane.origin_lat, selectedLane.origin_lon]} />
              <Marker position={[selectedLane.dest_lat, selectedLane.dest_lon]} />
              <Polyline positions={[[selectedLane.origin_lat, selectedLane.origin_lon], [selectedLane.dest_lat, selectedLane.dest_lon]]} color="cyan" />
              <Circle center={[selectedLane.origin_lat, selectedLane.origin_lon]} radius={120700} color="emerald" />
              <Circle center={[selectedLane.dest_lat, selectedLane.dest_lon]} radius={120700} color="emerald" />
            </>
          )}
        </MapContainer>
      </div>
    </main>
  );
}
