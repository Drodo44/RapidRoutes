// components/RecapExportButtons.js
export default function RecapExportButtons() {
  const downloadAll = async (params = "") => {
    const head = await fetch(`/api/exportDatCsv${params}`, { method: "HEAD" });
    let total = Number(head.headers.get("X-Total-Parts") || "1");
    if (!total || total < 1) total = 1;
    for (let part = 1; part <= total; part++) {
      const a = document.createElement("a");
      a.href = `/api/exportDatCsv?part=${part}${params ? `&${params.replace(/^\?/, "")}` : ""}`;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      await new Promise((r) => setTimeout(r, 250));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 justify-end">
      <button
        onClick={() => downloadAll("")}
        className="rounded-xl bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
      >
        Export DAT CSV
      </button>
      <button
        onClick={() => downloadAll("?fill=1")}
        className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        title="Allow ≤2 per KMA when needed"
      >
        Fill to 10 (allow KMA dup)
      </button>
      <button
        onClick={() => downloadAll("?days=7")}
        className="rounded-xl bg-gray-700 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-600"
        title="Last 7 days lanes only"
      >
        Last 7 days
      </button>
    </div>
  );
}
