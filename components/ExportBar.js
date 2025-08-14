// components/ExportBar.js
export default function ExportBar() {
  async function bulkDownload(params = "") {
    const head = await fetch(`/api/exportDatCsv${params}`, { method: "HEAD" });
    let total = Number(head.headers.get("X-Total-Parts") || "1");
    if (!total || total < 1) total = 1;

    for (let part = 1; part <= total; part++) {
      const a = document.createElement("a");
      const qp = new URLSearchParams(params.replace(/^\?/, ""));
      qp.set("part", String(part));
      a.href = `/api/exportDatCsv?${qp.toString()}`;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <button
        onClick={() => bulkDownload("?all=1")}
        className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
        title="Export all active lanes (intelligent KMA uniqueness)"
      >
        Export DAT CSV
      </button>

      <button
        onClick={() => bulkDownload("?all=1&fill=1")}
        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        title="If <10 pairs, allow smart, justified KMA duplicates to fill"
      >
        Fill to 10 (allow KMA dup)
      </button>

      <button
        onClick={() => bulkDownload("?all=1&days=7")}
        className="rounded-lg bg-gray-700 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-600"
        title="Only lanes created in the last 7 days"
      >
        Last 7 days
      </button>
    </div>
  );
}
