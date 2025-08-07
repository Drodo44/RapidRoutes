// pages/recap.js
import { useState } from "react";

const sampleLanes = [
  {
    id: 1,
    origin: "Chicago, IL",
    destination: "Dallas, TX",
    market_origin: "Chicago",
    market_dest: "Dallas",
    miles_from_origin: 42,
    miles_from_destination: 17,
    equipment: "FD",
    weather: "Clear",
    risk: "Low",
    selling_points: "Reload potential + dry outbound lane",
  },
  {
    id: 2,
    origin: "Atlanta, GA",
    destination: "Miami, FL",
    market_origin: "Atlanta",
    market_dest: "Miami",
    miles_from_origin: 22,
    miles_from_destination: 35,
    equipment: "RF",
    weather: "Storm warning",
    risk: "High",
    selling_points: "Produce lane w/ volatility, expect surges",
  },
];

export default function Recap() {
  const [lanes] = useState(sampleLanes);
  const [selectedLaneId, setSelectedLaneId] = useState(null);

  const scrollToLane = (id) => {
    const el = document.getElementById(`lane-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="min-h-screen bg-[#0b1623] py-10 px-4 text-white">
      <div className="max-w-7xl mx-auto bg-[#151d2b] rounded-2xl shadow-2xl p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-cyan-400">Active Postings Recap</h1>
          <select
            onChange={(e) => scrollToLane(Number(e.target.value))}
            className="bg-gray-800 text-white p-2 rounded-xl"
          >
            <option value="">Jump to Lane</option>
            {lanes.map((lane) => (
              <option key={lane.id} value={lane.id}>
                {lane.origin} → {lane.destination}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-white">
            <thead>
              <tr className="bg-[#233056] text-cyan-400">
                <th className="p-3">Origin</th>
                <th className="p-3">Destination</th>
                <th className="p-3">Origin Market</th>
                <th className="p-3">Dest Market</th>
                <th className="p-3">Miles from Origin</th>
                <th className="p-3">Miles from Dest</th>
                <th className="p-3">Weather</th>
                <th className="p-3">Risk</th>
                <th className="p-3">Selling Points</th>
              </tr>
            </thead>
            <tbody>
              {lanes.map((lane) => (
                <tr
                  key={lane.id}
                  id={`lane-${lane.id}`}
                  className="even:bg-[#1a2437] odd:bg-[#202b42] border-b border-gray-800"
                >
                  <td className="p-3">{lane.origin}</td>
                  <td className="p-3">{lane.destination}</td>
                  <td className="p-3">{lane.market_origin}</td>
                  <td className="p-3">{lane.market_dest}</td>
                  <td className="p-3">{lane.miles_from_origin}</td>
                  <td className="p-3">{lane.miles_from_destination}</td>
                  <td className="p-3">
                    <span
                      className={`font-semibold ${
                        lane.weather.includes("Storm") ? "text-yellow-400" : "text-green-400"
                      }`}
                    >
                      {lane.weather}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`font-semibold ${
                        lane.risk === "High" ? "text-red-400" : "text-green-400"
                      }`}
                    >
                      {lane.risk}
                    </span>
                  </td>
                  <td className="p-3 text-white font-medium">{lane.selling_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
