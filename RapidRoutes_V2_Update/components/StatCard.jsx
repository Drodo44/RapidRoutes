export default function StatCard({ label, value, icon }) {
  return (
    <div className="bg-gray-800 text-white p-4 rounded shadow-md flex items-center gap-4 w-full">
      <div className="text-3xl">{icon}</div>
      <div>
        <div className="text-sm text-gray-400">{label}</div>
        <div className="text-xl font-bold text-emerald-400">{value}</div>
      </div>
    </div>
  );
}
