// utils/exportButtons.js

import { triggerRecapDownload } from "../lib/exportRecap";

export default function ExportButtons() {
  return (
    <div className="flex gap-4 justify-end mb-4">
      <button
        onClick={triggerRecapDownload}
        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl font-semibold text-white"
      >
        Print Recap
      </button>
      <a
        href="/api/export/recap"
        className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl font-semibold text-white"
      >
        Download XLSX
      </a>
    </div>
  );
}
