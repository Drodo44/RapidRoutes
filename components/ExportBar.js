// file: components/ExportBar.js  (REPLACE)
// Exports PENDING lanes by default; other filters available via buttons.
export default function ExportBar() {
  async function multiDownload(qs) {
    const head = await fetch(`/api/exportDatCsv?${qs}`, { method: "HEAD" });
    let total = Number(head.headers.get("X-Total-Parts") || "1");
    if (!total || total < 1) total = 1;
    for (let i = 1; i <= total; i++) {
      const a = document.createElement("a");
      a.href = `/api/exportDatCsv?${qs}&part=${i}`;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // avoid popup blockers
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <button
        onClick={() => multiDownload("pending=1")}
        className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
        title="Export only lanes in Pending status"
      >
        Export DAT CSV (Pending)
      </button>

      <button
        onClick={() => multiDownload("pending=1&fill=1")}
        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        title="If an item has <10 pairs, allow justified KMA duplicates to reach 10"
      >
        Fill to 10 (Pending)
      </button>

      <button
        onClick={() => multiDownload("days=7")}
        className="rounded-lg bg-gray-700 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-600"
        title="Export lanes created in the last 7 days (any status except covered)"
      >
        Last 7 days
      </button>
    </div>
  );
}
