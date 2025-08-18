// components/ExportBar.js
export default function ExportBar() {
  async function exportPending(fill = false) {
    const head = await fetch(`/api/exportDatCsv?pending=1${fill ? "&fill=1" : ""}`, { method: "HEAD" });
    let total = Number(head.headers.get("X-Total-Parts") || "1");
    if (!total || total < 1) total = 1;
    for (let part = 1; part <= total; part++) {
      const a = document.createElement("a");
      a.href = `/api/exportDatCsv?pending=1${fill ? "&fill=1" : ""}&part=${part}`;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <button onClick={() => exportPending(false)} className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
        Export DAT CSV (Pending)
      </button>
      <button onClick={() => exportPending(true)} className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700" title="Allow justified KMA dup to fill to 10">
        Export DAT CSV (Pending, Fill-to-10)
      </button>
    </div>
  );
}
