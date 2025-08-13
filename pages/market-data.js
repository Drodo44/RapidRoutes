// pages/market-data.js
import { useCallback, useMemo, useState } from "react";
import Papa from "papaparse";

const EQUIPS = ["van", "reefer", "flatbed"];
const LEVELS = ["state", "region"];
const SOURCES = ["spot", "contract"];

function parseMatrixFromCsv(text) {
  const { data } = Papa.parse(text.trim());
  if (!Array.isArray(data) || !data.length) throw new Error("Empty CSV");
  const rows = data.map((r) => r.map((c) => String(c ?? "").trim()));
  const headers = rows[0].slice(1).map((h) => h.toUpperCase());
  const matrix = {};
  for (let i = 1; i < rows.length; i++) {
    const origin = (rows[i][0] || "").toUpperCase();
    if (!origin) continue;
    matrix[origin] = matrix[origin] || {};
    for (let j = 1; j < rows[i].length; j++) {
      const dest = headers[j - 1];
      const val = rows[i][j];
      const num = Number(String(val).replace(/[^0-9.]/g, ""));
      if (Number.isFinite(num)) matrix[origin][dest] = num;
    }
  }
  return matrix;
}

export default function MarketDataPage() {
  const [entries, setEntries] = useState([]);
  const [flatten, setFlatten] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const addFiles = useCallback(async (files, meta) => {
    const list = [];
    for (const file of files) {
      const text = await file.text();
      const matrix = parseMatrixFromCsv(text);
      list.push({ ...meta, name: file.name, matrix });
    }
    setEntries((prev) => [...prev, ...list]);
  }, []);

  const onDrop = async (e, meta) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    await addFiles(files, meta);
  };
  const onPick = async (e, meta) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    await addFiles(files, meta);
    e.target.value = "";
  };

  const upload = async () => {
    if (!entries.length) return setMsg("No files queued.");
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/uploadMarketData", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: entries.map(({ matrix, ...m }) => ({ ...m, matrix })), flatten }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Upload failed");
      setMsg(`Uploaded ${j.inserted} snapshot(s).`);
      setEntries([]);
    } catch (e) {
      setMsg(e.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const Group = ({ title, equip }) => (
    <div className="card p-4">
      <div className="mb-2 font-semibold">{title}</div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {LEVELS.map((level) =>
          SOURCES.map((source) => (
            <DropPick
              key={`${equip}-${level}-${source}`}
              label={`${equip} • ${level} • ${source}`}
              onDrop={(e) => onDrop(e, { equipment: equip, level, source })}
              onPick={(e) => onPick(e, { equipment: equip, level, source })}
            />
          ))
        )}
      </div>
    </div>
  );

  return (
    <main className="mx-auto max-w-6xl p-6 text-gray-100">
      <h1 className="mb-4 text-2xl font-bold">Market Data Upload</h1>

      <div className="mb-3 flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={flatten} onChange={(e) => setFlatten(e.target.checked)} />
          Create flattened table (faster lookups)
        </label>
        {msg && <div className="text-sm text-gray-300">{msg}</div>}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {EQUIPS.map((e) => (
          <Group key={e} title={e[0].toUpperCase() + e.slice(1)} equip={e} />
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          disabled={busy || !entries.length}
          onClick={upload}
          className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {busy ? "Uploading…" : `Upload ${entries.length} file(s)`}
        </button>
      </div>

      {entries.length > 0 && (
        <div className="mt-4 rounded-xl border border-gray-700 bg-[#0f1115] p-4">
          <div className="mb-2 text-sm font-semibold">Queued</div>
          <ul className="text-sm text-gray-300">
            {entries.map((e, i) => (
              <li key={i}>
                {e.name} — {e.equipment} / {e.level} / {e.source}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}

function DropPick({ label, onDrop, onPick }) {
  const [hover, setHover] = useState(false);
  return (
    <label
      onDragOver={(e) => (e.preventDefault(), setHover(true))}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => (setHover(false), onDrop(e))}
      className={`flex h-24 cursor-pointer items-center justify-center rounded-lg border border-dashed ${
        hover ? "border-blue-500 bg-blue-500/10" : "border-gray-700 bg-gray-900"
      }`}
    >
      <input type="file" accept=".csv,text/csv" onChange={onPick} className="hidden" />
      <span className="text-sm text-gray-300">Drop CSV or click — {label}</span>
    </label>
  );
}
