// pages/dashboard.js
import MarketMap from "../components/MarketMap";
import { useMemo, useState } from "react";

export default function Dashboard() {
  return (
    <main className="mx-auto max-w-6xl p-6 text-gray-100">
      <h1 className="mb-4 text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4">
        <MarketMap />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <FloorSpaceCalculator />
        <HeavyHaulChecker />
      </div>
    </main>
  );
}

function FloorSpaceCalculator() {
  const [l, setL] = useState(""), [w, setW] = useState(""), [h, setH] = useState("");
  const result = useMemo(() => {
    const L = Number(l), W = Number(w), H = Number(h);
    if (!L || !W || !H) return "";
    const fits26 = L <= 312 && W <= 98 && H <= 98;
    const fits53 = L <= 636 && W <= 100 && H <= 110;
    if (fits26) return "Fits in 26’ box truck";
    if (fits53) return "Fits in full dry van";
    return "Oversize";
  }, [l, w, h]);
  return (
    <div className="rounded-xl border border-gray-700 bg-[#0f1115] p-4">
      <h2 className="mb-2 font-semibold">Floor Space Calculator (inches)</h2>
      <div className="grid grid-cols-3 gap-3">
        <Input label="Length (in)" v={l} setV={setL} />
        <Input label="Width (in)" v={w} setV={setW} />
        <Input label="Height (in)" v={h} setV={setH} />
      </div>
      <div className="mt-3 text-sm text-gray-300">{result || "—"}</div>
    </div>
  );
}

function HeavyHaulChecker() {
  const [l, setL] = useState(""), [w, setW] = useState(""), [h, setH] = useState(""), [wt, setWt] = useState("");
  const result = useMemo(() => {
    const L = Number(l), W = Number(w), H = Number(h), WT = Number(wt);
    if (!L || !W || !H || !WT) return "";
    const flags = [];
    if (L > 636) flags.push("length");
    if (W > 102) flags.push("width");
    if (H > 162) flags.push("height");
    if (WT > 80000) flags.push("weight");
    return flags.length ? `OVERSIZE: ${flags.join(", ")}` : "Within standard limits";
  }, [l, w, h, wt]);
  const emailText = `Subject: Oversize Permit Request

Hello,

We have an oversize load requiring permits.
Dimensions: ${l}" x ${w}" x ${h}", Weight: ${wt} lbs.
Please advise next steps.

Thanks.`;
  return (
    <div className="rounded-xl border border-gray-700 bg-[#0f1115] p-4">
      <h2 className="mb-2 font-semibold">Heavy Haul Checker</h2>
      <div className="grid grid-cols-4 gap-3">
        <Input label="Length (in)" v={l} setV={setL} />
        <Input label="Width (in)" v={w} setV={setW} />
        <Input label="Height (in)" v={h} setV={setH} />
        <Input label="Weight (lbs)" v={wt} setV={setWt} />
      </div>
      <div className="mt-3 text-sm text-gray-300">{result || "—"}</div>
      {result.startsWith("OVERSIZE") && (
        <button
          onClick={() => navigator.clipboard.writeText(emailText)}
          className="mt-3 rounded bg-gray-700 px-3 py-2 text-sm hover:bg-gray-600"
        >
          Copy permit email template
        </button>
      )}
    </div>
  );
}

function Input({ label, v, setV }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-gray-400">{label}</label>
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white"
        inputMode="numeric"
      />
    </div>
  );
}
