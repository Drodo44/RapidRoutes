"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function WeeklyChart() {
  const chartData = [
    { name: "Mon", loads: 8 },
    { name: "Tue", loads: 12 },
    { name: "Wed", loads: 5 },
    { name: "Thu", loads: 14 },
    { name: "Fri", loads: 10 },
  ];
  return (
    <div className="h-80">
      <h3 className="text-2xl font-semibold mb-4">Weekly Loads</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="loads" stroke="#22d3ee" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
