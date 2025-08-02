// pages/dashboard.js
export default function Dashboard() {
  return (
    <div className="text-white">
      <h1 className="text-4xl font-bold mb-4 text-cyan-400">Welcome to RapidRoutes</h1>
      <p className="text-gray-300 mb-6">
        Your all-in-one freight command center. Manage, export, and dominate the lanes.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-4 rounded shadow">
          <h2 className="text-lg font-semibold text-emerald-400">📦 Active Lanes</h2>
          <p className="text-2xl mt-2">8</p>
        </div>
        <div className="bg-gray-800 p-4 rounded shadow">
          <h2 className="text-lg font-semibold text-yellow-400">📊 KPIs</h2>
          <p className="text-sm mt-2">Smart insights coming soon</p>
        </div>
        <div className="bg-gray-800 p-4 rounded shadow">
          <h2 className="text-lg font-semibold text-blue-400">🧠 AI Suggestions</h2>
          <p className="text-sm mt-2">We'll flag potential optimizations here</p>
        </div>
      </div>
    </div>
  );
}
