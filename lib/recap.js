// pages/recap.js

import { useState, useEffect } from "react";
import { fetchRecapLanes } from "../utils/api"; // assumes backend call
import { getDistanceToMarket, getSellingPoints, getWeatherFlags } from "../utils/recapLogic";

export default function Recap() {
  const [lanes, setLanes] = useState([]);

  useEffect(() => {
    fetchLanes();
  }, []);

  const fetchLanes = async () => {
    const data = await fetchRecapLanes();
    setLanes(data);
  };

  return (
    <div className="min-h-screen bg-[#0b1623] py-10 px-4 text-white">
      <div className="max-w-7xl mx-auto bg-[#151d2b] rounded-2xl shadow-2xl p-6">
        <h1 className="text-4xl font-bold text-neon-blue mb-6 text-center">Active Postings Recap</h1>
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-[#233056] text-neon-blue">
            <tr>
              <th className="p-3">Pickup</th>
              <th className="p-3">Delivery</th>
              <th className="p-3">Miles to Market</th>
              <th className="p-3">Equipment</th>
              <th className="p-3">Weight</th>
              <th className="p-3">Date</th>
              <th className="p-3">RRSI</th>
              <th className="p-3">Insights</th>
              <th className="p-3">Flags</th>
            </tr>
          </thead>
          <tbody>
            {lanes.map((lane) => {
              const miles = getDistanceToMarket(lane.originZip, lane.destZip);
              const selling = getSellingPoints(lane.originCity, lane.destCity);
              const flags = getWeatherFlags(lane.originCity, lane.destCity);

              return (
                <tr key={lane.id} className="even:bg-[#1a2437] odd:bg-[#202b42]">
                  <td className="p-3">{lane.originCity}, {lane.originState}</td>
                  <td className="p-3">{lane.destCity}, {lane.destState}</td>
                  <td className="p-3 text-yellow-400">{miles} mi</td>
                  <td className="p-3">{lane.equipment}</td>
                  <td className="p-3">{lane.weight} lbs</td>
                  <td className="p-3">{lane.date}</td>
                  <td className="p-3 font-bold text-neon-green">{lane.rrsi}</td>
                  <td className="p-3">{selling}</td>
                  <td className="p-3 text-red-400">{flags}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <footer className="mt-10 text-xs text-gray-400 text-center">
          Created by Andrew Connellan – Logistics Account Executive at Total Quality Logistics HQ: Cincinnati, OH
        </footer>
      </div>
    </div>
  );
}
