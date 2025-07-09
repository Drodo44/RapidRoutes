// pages/recap.js

import { useState } from "react";

const sampleLanes = [
  {
    id: 1,
    origin: "Chicago, IL",
    destination: "Dallas, TX",
    equipment: "FD",
    weight: 48000,
    date: "2025-07-10",
    length: 48,
    status: "Active",
    rrs: 98,
    comment: "",
  },
  {
    id: 2,
    origin: "Atlanta, GA",
    destination: "Miami, FL",
    equipment: "RF",
    weight: 47000,
    date: "2025-07-10",
    length: 53,
    status: "Pending",
    rrs: 95,
    comment: "HAZMAT",
  },
];

export default function Recap() {
  const [lanes] = useState(sampleLanes);

  return (
    <div className="min-h-screen bg-[#0b1623] py-10 px-4">
      <div className="max-w-6xl mx-auto bg-[#151d2b] rounded-2xl shadow-2xl p-6">
        <h1 className="text-4xl font-bold text-neon-blue mb-8">Active Postings Recap</h1>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-white">
            <thead>
              <tr className="bg-[#233056] text-neon-blue">
                <th className="p-3">Origin</th>
                <th className="p-3">Destination</th>
                <th className="p-3">Equipment</th>
                <th className="p-3">Weight</th>
                <th className="p-3">Date</th>
                <th className="p-3">Length</th>
                <th className="p-3">Status</th>
                <th className="p-3">RRSI</th>
                <th className="p-3">Comment</th>
              </tr>
            </thead>
            <tbody>
              {lanes.map((lane) => (
                <tr key={lane.id} className="even:bg-[#1a2437] odd:bg-[#202b42]">
                  <td className="p-3">{lane.origin}</td>
                  <td className="p-3">{lane.destination}</td>
                  <td className="p-3">{lane.equipment}</td>
                  <td className="p-3">{lane.weight}</td>
                  <td className="p-3">{lane.date}</td>
                  <td className="p-3">{lane.length}</td>
                  <td className="p-3">{lane.status}</td>
                  <td className="p-3 font-bold text-neon-green">{lane.rrs}</td>
                  <td className="p-3">{lane.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

