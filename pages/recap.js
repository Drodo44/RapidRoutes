// pages/recap.js
import { useState } from "react";

const sampleLanes = [
  {
    id: 1,
    origin: "Chicago, IL",
    destination: "Dallas, TX",
    miles_from_origin: 42,
    miles_from_destination: 18,
    market_origin: "Chicago",
    market_dest: "Dallas",
    selling_points: "Stable reefer demand + reload options",
  },
  {
    id: 2,
    origin: "Atlanta, GA",
    destination: "Miami, FL",
    miles_from_origin: 28,
    miles_from_destination: 34,
    market_origin: "Atlanta",
    market_dest: "Miami",
    selling_points: "High outbound volume post produce surge",
  },
];

export default function Recap() {
  const [lanes] = useState(sampleLanes);

  return (
    <div className="min-h-screen bg-[#0b1623] py-10 px-4">
      <div className="max-w-6xl mx-auto bg-[#151d2b] rounded-2xl shadow-2xl p-6">
        <h1 className="text-4xl font-bold text-cyan-400 mb-8">Active Postings Recap</h1>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-white">
            <thead>
              <tr className="bg-[#233056] text-cyan-400">
                <th className="p-3">Origin</th>
                <th className="p-3">Destination</th>
                <th className="p-3">Origin Market</th>
                <th className="p-3">Dest Market</th>
                <th className="p-3">Miles from Origin</th>
                <th className="p-3">Miles from Dest</th>
                <th className="p-3">Selling Points</th>
              </tr>
            </thead>
            <tbody>
              {lanes.map((lane) => (
                <tr key={lane.id} className="even:bg-[#1a2437] odd:bg-[#202b42]">
                  <td className="p-3">{lane.origin}</td>
                  <td className="p-3">{lane.destination}</td>
                  <td className="p-3">{lane.market_origin}</td>
                  <td className="p-3">{lane.market_dest}</td>
                  <td className="p-3">{lane.miles_from_origin}</td>
                  <td className="p-3">{lane.miles_from_destination}</td>
                  <td className="p-3 text-green-400 font-medium">{lane.selling_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
