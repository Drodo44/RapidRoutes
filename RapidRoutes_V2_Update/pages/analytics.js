import React from "react";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";

export default function AnalyticsPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-cyan-400 mb-6">Full Analytics Overview</h1>
      <AnalyticsDashboard />
    </div>
  );
}