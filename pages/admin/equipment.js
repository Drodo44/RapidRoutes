// pages/admin/equipment.js
import { useEffect, useState } from "react";
import Head from "next/head";
import { supabase } from "../../utils/supabaseClient.js";

const DAT_SEED = `V, Dry Van
VA, Van Air Ride
VS, Van Conestoga
V2, Van Double
V3, Van Triple
VZ, Van Hazmat
VH, Van Hotshot
VI, Van Insulated
VN, Van Intermodal
VG, Van Lift Gate
VB, Van Roller Bed
VP, Van Pallet Exchange
VR, Van or Reefer
VF, Van or Flatbed
VC, Van w/Curtains
VM, Van w/Team
VW, Van Vented
R, Reefer
RA, Reefer Air-Ride
RZ, Reefer Hazmat
RN, Reefer Intermodal
RL, Reefer Lift Gate
RP, Reefer Pallet Exchange
RM, Reefer Multi-Temp
IR, Insulated Van or Reefer
F, Flatbed
FA, Flatbed Air-Ride
FN, Flatbed Conestoga
F2, Flatbed Double
FZ, Flatbed Hazmat
FH, Flatbed Hotshot
MX, Flatbed Maxi
FD, Flatbed or Step Deck
SD, Step Deck
DD, Double Drop
RGN, Removable Gooseneck
LB, Lowboy
ST, Stretch Trailer
PO, Power Only
SB, Straight Box Truck
SB2, Straight Box 22–26ft
HB, Hopper Bottom
PN, Pneumatic (Dry Bulk)
BL, Belt Trailer
LF, Live Floor (Walking Floor)
ED, End Dump
BD, Bottom Dump
AC, Auto Carrier
BT, B-Train
C, Container
CI, Container Insulated
CR, Container Refrigerated
CV, Conveyor
LA, Drop Deck Landoll
DT, Dump Trailer
T, Tanker
TA, Tanker (Aluminum/General)
TN, Tanker Intermodal
TS, Tanker Steel
TT, Truck and Trailer
SV, Specialized (Class V)
SZ, Specialized (Class Z)
SC, Specialized (Class C)
SM, Specialized (Class M)
BZ, Specialized (BZ)
BR, Specialized (BR)
RG, RGN Variant
SR, Step/Double Variant
SN, Specialized (SN)
VV, Van Variant
VT, Van/Flatbed Variant
VG2, Van Lift Gate (Alt)
OT, Van Open Top
OT2, Open Top (Alt)`;
// Labels are UI-only. CSV uses the code.

export default function EquipmentAdmin() {
  const [rows, setRows] = useState([]);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setMsg("");
    const { data, error } = await supabase.from("equipment_codes").select("code, label").order("code", { ascending: true }).limit(2000);
    if (error) return setMsg(error.message);
    setRows(data || []);
  }
  useEffect(() => { load(); }, []);

  function loadSeed() { setText(DAT_SEED); }

  async function save() {
    setBusy(true); setMsg("");
    try {
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const upserts = [];
      for (const line of lines) {
        const m = line.split(/,|\||\t/);
        const code = (m[0] || "").trim().toUpperCase();
        const label = (m[1] || "").trim() || code;
        if (!code) continue;
        upserts.push({ code, label });
      }
      if (!upserts.length) { setMsg("Nothing to import."); return; }
      while (upserts.length) {
        const batch = upserts.splice(0, 200);
        const { error } = await supabase.from("equipment_codes").upsert(batch);
        if (error) throw error;
      }
      setMsg("Saved."); setText(""); await load();
    } catch (e) { setMsg(e.message || "Save failed"); } finally { setBusy(false); }
  }

  async function remove(code) {
    if (!confirm(`Delete ${code}?`)) return;
    const { error } = await supabase.from("equipment_codes").delete().eq("code", code);
    if (error) return setMsg(error.message);
    await load();
  }

  return (
    <>
      <Head><title>Equipment — Admin</title></Head>
      <main className="mx-auto max-w-4xl p-6 text-gray-100">
        <h1 className="mb-4 text-2xl font-bold">Equipment Codes</h1>
        <div className="card mb-6 space-y-2 p-4">
          <p className="text-sm text-gray-300">
            Click <em>Load DAT Seed</em> to preload a comprehensive set, or paste your own (<code>CODE, Label</code> per line).
          </p>
          <div className="flex items-center gap-2">
            <button onClick={loadSeed} className="rounded bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600">Load DAT Seed</button>
            <button onClick={save} disabled={busy} className="rounded bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
              {busy ? "Saving…" : "Save list"}
            </button>
            {msg && <div className="text-sm text-gray-300">{msg}</div>}
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10}
            placeholder={`V, Dry Van\nR, Reefer\nF, Flatbed\n...`}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white" />
        </div>
        <div className="rounded-xl border border-gray-700">
          <div className="hidden grid-cols-6 gap-3 bg-gray-900 px-3 py-2 text-xs text-gray-400 md:grid">
            <div className="col-span-2">Code</div><div className="col-span-4">Label</div>
          </div>
          <div className="divide-y divide-gray-800">
            {rows.map((r) => (
              <div key={r.code} className="grid grid-cols-1 gap-3 px-3 py-3 text-sm md:grid-cols-6">
                <div className="font-semibold md:col-span-2">{r.code}</div>
                <div className="text-gray-300 md:col-span-3">{r.label}</div>
                <div className="md:col-span-1 md:text-right">
                  <button onClick={() => remove(r.code)} className="rounded bg-red-700 px-2 py-1 text-xs text-white hover:bg-red-800">Delete</button>
                </div>
              </div>
            ))}
            {!rows.length && <div className="px-3 py-3 text-sm text-gray-300">No codes yet.</div>}
          </div>
        </div>
      </main>
    </>
  );
}
