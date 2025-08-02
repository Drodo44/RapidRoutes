export default function LaneCard({ lane }) {
  return (
    <div className="bg-gray-900 p-4 rounded shadow mb-4">
      <h2 className="text-lg font-bold">
        {lane.origin} ➝ {lane.destination}
      </h2>
      <p className="text-sm text-gray-300">
        {lane.equipment} • {lane.length}ft • {lane.baseWeight || "?"} lbs
      </p>
      {lane.note && <p className="text-green-400 mt-2">{lane.note}</p>}
    </div>
  );
}
