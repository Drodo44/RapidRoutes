import { useState, useEffect } from 'react';
import supabase from '../utils/supabaseClient';
import dynamic from 'next/dynamic';

// Dynamically import react-leaflet (for map display)
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then(mod => mod.Circle), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });

export default function Recap() {
  const [lanes, setLanes] = useState([]);
  const [selectedLane, setSelectedLane] = useState(null);
  const [search, setSearch] = useState('');
  const [filteredResults, setFilteredResults] = useState([]);
  const [weather, setWeather] = useState({ pickup: null, delivery: null });
  const [aiNotes, setAiNotes] = useState('');
  const [carrierSuggestions, setCarrierSuggestions] = useState([]);
  const [marketRisk, setMarketRisk] = useState('');

  useEffect(() => {
    const fetchLanes = async () => {
      const { data } = await supabase
        .from('lanes')
        .select('*')
        .eq('status', 'Active')
        .order('created_at', { ascending: false });
      if (data) setLanes(data);
    };
    fetchLanes();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredResults([]);
      return;
    }
    const term = search.toLowerCase();
    setFilteredResults(
      lanes
        .filter(
          (l) =>
            l.origin_city.toLowerCase().includes(term) ||
            l.dest_city.toLowerCase().includes(term) ||
            (l.id && l.id.toString().includes(term))
        )
        .slice(0, 10)
    );
  }, [search, lanes]);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!selectedLane) return;
      const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
      const fetchCityWeather = async (city, state) => {
        try {
          const resp = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city},${state},US&appid=${apiKey}&units=imperial`
          );
          if (!resp.ok) return null;
          const data = await resp.json();
          return { temp: data.main.temp, conditions: data.weather[0].description };
        } catch {
          return null;
        }
      };
      const pickupWeather = await fetchCityWeather(selectedLane.origin_city, selectedLane.origin_state);
      const deliveryWeather = await fetchCityWeather(selectedLane.dest_city, selectedLane.dest_state);
      setWeather({ pickup: pickupWeather, delivery: deliveryWeather });
    };
    fetchWeather();
  }, [selectedLane]);

  useEffect(() => {
    const generateInsights = async () => {
      if (!selectedLane) return;

      // Market volatility (simple placeholder logic using randomization for now)
      const riskLevels = ['Stable', 'Volatile', 'High Demand', 'Low Demand'];
      const randomRisk = riskLevels[Math.floor(Math.random() * riskLevels.length)];
      setMarketRisk(randomRisk);

      // AI freight notes
      const notes = {
        Stable: "Market is stable. Expect average call volume.",
        Volatile: "Rates moving quickly — check DAT rate trends before quoting.",
        "High Demand": "Strong call potential. Consider quoting slightly higher to maximize margin.",
        "Low Demand": "Quiet market. Be aggressive on rates to secure carriers."
      };
      setAiNotes(notes[randomRisk] || "No market trend data available.");

      // Carrier suggestions based on archived lanes (pull top 3)
      const { data: carriers } = await supabase
        .from('lanes')
        .select('comment')
        .eq('status', 'Archived')
        .ilike('origin_city', `%${selectedLane.origin_city}%`)
        .limit(10);
      if (carriers) {
        const names = carriers
          .map((c) => c.comment || '')
          .filter((c) => c.toLowerCase().includes('carrier'))
          .slice(0, 3);
        setCarrierSuggestions(names.length > 0 ? names : ['No carrier history found']);
      }
    };
    generateInsights();
  }, [selectedLane]);

  const handleSelectLane = (lane) => {
    setSelectedLane(lane);
    setSearch('');
    setFilteredResults([]);
  };

  const handleExportHTML = () => {
    const htmlContent = document.documentElement.outerHTML;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Active_Postings_Recap.html';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    window.location.href = '/api/exportDatCsv';
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-cyan-400">Active Postings Recap</h1>
        <button
          onClick={exportCsv}
          className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl shadow-lg"
        >
          Export DAT CSV
        </button>
      </div>

      {/* Snap Dropdown */}
      <div className="relative mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by city, ZIP, or Lane ID..."
          className="w-full p-3 rounded-lg bg-gray-900 text-white"
        />
        {filteredResults.length > 0 && (
          <ul className="absolute z-10 bg-gray-800 text-white w-full mt-1 rounded-lg max-h-64 overflow-auto shadow-lg">
            {filteredResults.map((lane) => (
              <li
                key={lane.id}
                onClick={() => handleSelectLane(lane)}
                className="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700"
              >
                <div className="font-bold">
                  {lane.origin_city}, {lane.origin_state} → {lane.dest_city}, {lane.dest_state}
                </div>
                <div className="text-sm text-gray-400">
                  {lane.equipment} • {lane.weight} lbs • Posted {new Date(lane.created_at).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Snap Card */}
      {selectedLane && (
        <div className="bg-gray-900 p-4 rounded-2xl mb-6 shadow-lg">
          <h2 className="text-xl text-emerald-400 mb-2">
            {selectedLane.origin_city}, {selectedLane.origin_state} → {selectedLane.dest_city},{' '}
            {selectedLane.dest_state}
          </h2>
          <p className="text-gray-300">
            Equipment: {selectedLane.equipment} | Weight: {selectedLane.weight} lbs | Length: {selectedLane.length} ft
          </p>
          <p className="text-gray-400">Posted {new Date(selectedLane.created_at).toLocaleDateString()}</p>

          {weather.pickup && (
            <p className="mt-2 text-gray-300">
              Pickup Weather: {weather.pickup.temp}°F, {weather.pickup.conditions}
            </p>
          )}
          {weather.delivery && (
            <p className="text-gray-300">
              Delivery Weather: {weather.delivery.temp}°F, {weather.delivery.conditions}
            </p>
          )}

          <p className="mt-2 text-yellow-400">Market Condition: {marketRisk}</p>
          <p className="text-cyan-300 mt-1">{aiNotes}</p>

          <div className="mt-2 text-gray-300">
            <p className="font-bold">Carrier Suggestions:</p>
            <ul className="list-disc list-inside">
              {carrierSuggestions.map((c, idx) => (
                <li key={idx}>{c}</li>
              ))}
            </ul>
          </div>

          <div className="flex space-x-4 mt-4">
            <button
              onClick={handleExportHTML}
              className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-xl shadow-lg"
            >
              Download Recap
            </button>
            <button
              onClick={exportCsv}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-xl shadow-lg"
            >
              Export DAT CSV
            </button>
          </div>
        </div>
      )}

      {/* Map View */}
      <div className="bg-gray-900 p-4 rounded-2xl shadow-lg">
        <MapContainer center={[39.5, -98.35]} zoom={4} style={{ height: '500px', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {selectedLane && (
            <>
              <Marker position={[selectedLane.origin_lat, selectedLane.origin_lon]} />
              <Marker position={[selectedLane.dest_lat, selectedLane.dest_lon]} />
              <Polyline
                positions={[
                  [selectedLane.origin_lat, selectedLane.origin_lon],
                  [selectedLane.dest_lat, selectedLane.dest_lon]
                ]}
                color="cyan"
              />
              <Circle center={[selectedLane.origin_lat, selectedLane.origin_lon]} radius={120700} color="emerald" />
              <Circle center={[selectedLane.dest_lat, selectedLane.dest_lon]} radius={120700} color="emerald" />
            </>
          )}
        </MapContainer>
      </div>
    </main>
  );
}
