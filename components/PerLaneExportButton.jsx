// components/PerLaneExportButton.js
export default function PerLaneExportButton({ laneId, fill = false, className = "" }) {
  const href = `/api/exportLaneCsv?id=${encodeURIComponent(laneId)}${fill ? "&fill=1" : ""}`;
  return (
    <a
      href={href}
      className={
        className ||
        "rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700"
      }
    >
      Export CSV
    </a>
  );
}
