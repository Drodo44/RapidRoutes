import { useState, useEffect } from 'react';
import supabase from '../utils/supabaseClient';
import dynamic from 'next/dynamic';

// Dynamically import react-leaflet (to avoid SSR issues)
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

  // Fetch all active lanes
  useEffect(() => {
    const fetchLanes = async () => {
      const { data, error } = await supabase
        .from('lanes')
        .select('*')
        .eq('status', 'Active')
        .order('created_at', { ascending: false });
      if (!error) setLanes(data);
    };
    fetchLanes();
  }, []);

  // Search filter for dropdown
  useEffect(() => {
    if (search.trim() === '') {
      setFilteredResults([]);
      return;
    }
    const term = search.toLowerCase();
    const results = lanes.filter(l =>
      l.origin_city.toLowerCase().includes(term) ||
      l.dest_city.toLowerCase().includes(term) ||
      (l.id && l.id.toString().includes(term))
    );
    setFilteredResults(results.slice(0, 10)); // show top 10
  }, [search, lanes]);

  // Fetch weather data for selected lane
  useEffect(() => {
    const fetchWeather = async () => {
      if (!selectedLane) return;
      const fetchCityWeather = async (city, state) => {
        try {
          const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
          const resp = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city},${state},US&appid=${apiKey}&units=imperial`);
          if (!resp.ok) return null;
          const data = await resp.json();
          return {
            temp: data.main.temp,
            conditions: data.weather[0].description
          };
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

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-3xl font-bold mb-4 text-cyan-400">Active Postings Recap</h1>

      {/* Search dropdown */}
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
                <div className="font-bold">{lane.origin_city}, {lane.origin_state} → {lane.dest_city}, {lane.dest_state}</div>
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
            {selectedLane.origin_city}, {selectedLane.origin_state} → {selectedLane.dest_city}, {selectedLane.dest_state}
          </h2>
          <p className="text-gray-300">Equipment: {selectedLane.equipment} | Weight: {selectedLane.weight} lbs | Length: {selectedLane.length} ft</p>
          <p className="text-gray-400">Posted on {new Date(selectedLane.created_at).toLocaleDateString()}</p>
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
          <div className="flex space-x-4 mt-4">
            <button onClick={handleExportHTML} className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-xl shadow-lg">Download Recap</button>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="bg-gray-900 p-4 rounded-2xl shadow-lg">
        <MapContainer center={[39.5, -98.35]} zoom={4} style={{ height: '500px', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {selectedLane && (
            <>
              <Marker position={[selectedLane.origin_lat, selectedLane.origin_lon]} />
              <Marker position={[selectedLane.dest_lat, selectedLane.dest_lon]} />
              <Polyline positions={[
                [selectedLane.origin_lat, selectedLane.origin_lon
