// pages/lanes.js
import { useEffect, useState } from "react";
import Head from "next/head";
import { supabase } from "../utils/supabaseClient.js";
import CityAutocomplete from "../components/CityAutocomplete.js";
import EquipmentAutocomplete from "../components/EquipmentAutocomplete.js";
import RandomizeWeightPopup from "../components/RandomizeWeightPopup.js";
import ExportBar from "../components/ExportBar.js";
import CrawlPreviewBanner from "../components/CrawlPreviewBanner.js";

export default function LanesPage() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [equipment, setEquipment] = useState("V");
  const [length, setLength] = useState("53");
  const [pickupEarliest, setPickupEarliest] = useState("");
  const [pickupLatest, setPickupLatest] = useState("");
  const [randomize, setRandomize] = useState(false);
  const [weight, setWeight] = useState("");
  const [range, setRange] = useState({ min: "", max: "" });
  const [sessionDefaultRange, setSessionDefaultRange] = useState(null);
  const [openRand, setOpenRand] = useState(false);
  const [fullPartial, setFullPartial] = useState("full");
  const [commodity, setCommodity] = useState("");
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState("");

  const [originState, setOriginState] = useState("");
  const [originZip, setOriginZip] = useState("");
  const [destState, setDestState] = useState("");
  const [destZip, setDestZip] = useState("");

  const [tab, setTab] = useState("pending");
  const [pending, setPending] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState("");

  const fmtUS = (iso) => {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || "";
    const [y, m, d] = iso.split("-").map(Number);
    return `${m}/${d}/${y}`;
  };
  const parseCity = (s) => (String(s || "").split(",")[0] || "").trim();
  const guessState = (s) => (String(s || "").split(",")[1] || "").trim();

  function validate() {
    if (!origin || !destination) return "Origin and Destination are required.";
    if (!equipment) return "Equipment code is required.";
    if (!Number.isFinite(Number(length)) || Number(length) <= 0) return "Length must be a positive number.";
    if (!pickupEarliest) return "Pickup Earliest is required.";
    if (!pickupLatest) return "Pickup Latest is required.";
    if (randomize) {
      const mi = Number(range.min), ma = Number(range.max);
      if (!Number.isFinite(mi) || !Number.isFinite(ma) || mi <= 0 || ma < mi) return "Enter a valid weight range.";
    } else if (!Number.isFinite(Number(weight)) || Number(weight) <= 0) {
      return "Weight is required.";
    }
    return "";
  }

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    const err = validate();
    if (err) return setMsg(err);

    const row = {
      origin_city: parseCity(origin),
      origin_state: originState || guessState(origin),
      origin_zip: originZip || null,
      dest_city: parseCity(destination),
      dest_state: destState || guessState(destination),
      dest_zip: destZip || null,
      equipment_code: equipment,
      length_ft: Number(length),
      pickup_earliest: pickupEarliest,
      pickup_latest: pickupLatest,
      randomize_weight: !!randomize,
      weight_lbs: randomize ? null : Number(weight),
      weight_min: randomize ? Number(range.min) : null,
      weight_max: randomize ? Number(range.max) : null,
      full_partial: fullPartial,
      commodity: commodity || null,
      comment: comment || null,
      status: "pending",
    };

    const { error } = await supabase.from("lanes").insert(row);
    if (error) return setMsg(error.message || "Failed to save lane.");

    setMsg("Lane added to Pending.");
    resetForm();
    await loadLists();
    setTab("pending");
  }

  function resetForm() {
    setOrigin(""); setDestination(""); setEquipment("V"); setLength("53");
    setPickupEarliest(""); setPickupLatest("");
    setRandomize(false); setWeight("");
    setRange({ min: sessionDefaultRange?.min || "", max: sessionDefaultRange?.max || "" });
    setFullPartial("full"); setCommodity(""); setComment("");
    setOriginState(""); setOriginZip(""); setDestState(""); setDestZip("");
  }

  async function loadLists() {
    setLoadingList(true); setListError("");
    try {
      const [p, r] = await Promise.all([
        supabase.from("lanes").select("id, origin_city, origin_state, origin_zip, dest_city, dest_state, dest_zip, equipment_code, length_ft, randomize_weight, weight_lbs, weight_min, weight_max, pickup_earliest, pickup_latest, full_partial, created_at, status").eq("status", "pending").order("created_at", { ascending: false }).limit(200),
        supabase.from("lanes").select("id, origin_city, origin_state, origin_zip, dest_city, dest_state, dest_zip, equipment_code, length_ft, randomize_weight, weight_lbs, weight_min, weight_max, pickup_earliest, pickup_latest, full_partial, created_at, status").order("created_at", { ascending: false }).limit(50),
      ]);
      if (p.error) throw p.error;
      if (r.error) throw r.error;
      setPending(p.data || []);
      setRecent(r.data || []);
    } catch (e) {
      setListError(e.message || "Failed to load lanes");
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadLists();
    try {
      const ch = supabase
        .channel("lanes_status_changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "lanes" }, loadLists)
        .subscribe();
      return () => { try { supabase.removeChannel(ch); } catch {} };
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exportLane(id, fill = false) {
    const a = document.createElement("a");
    a.href = `/api/exportLaneCsv?id=${encodeURIComponent(id)}${fill ? "&fill=1" : ""}`;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function setStatus(id, status) {
    const { error } = await supabase.from("lanes").update({ status }).eq("id", id);
    if (error) alert(error.message || "Status update failed");
  }

  async function deleteLane(id) {
    if (!confirm("Delete this lane?")) return;
    const { error } = await supabase.from("lanes").delete().eq("id", id);
    if (error) alert(error.message || "Delete failed");
  }

  function Row({ x, showActions }) {
    const laneText = `${x.origin_city}${x.origin_state ? ", " + x.origin_state : ""}${x.origin_zip ? " " + x.origin_zip : ""} → ${x.dest_city}${x.dest_state ? ", " + x.dest_state : ""}${x.dest_zip ? " " + x.dest_zip : ""}`;
    const win =
      x.pickup_earliest && x.pickup_latest
        ? (x.pickup_earliest === x.pickup_latest ? fmtUS(x.pickup_earliest) : `${fmtUS(x.pickup_earliest)}–${fmtUS(x.pickup_latest)}`)
        : "—";
    const w = x.randomize_weight ? `${x.weight_min || "?"}–${x.weight_max || "?"}` : (x.weight_lbs ? String(x.weight_lbs) : "—");

    return (
      <div className="grid grid-cols-1 gap-3 px-3 py-3 text-sm md:grid-cols-12">
        <div className="md:col-span-4">
          <div className="font-medium text-gray-100">{laneText}</div>
          <div className="text-xs text-gray-400">{x.status}</div>
        </div>
        <div className="text-gray-300 md:col-span-2">{win}</div>
        <div className="text-gray-300 md:col-span-2">{x.equipment_code} / {x.length_ft}</div>
        <div className="text-gray-300 md:col-span-2">{w}</div>
        <div className="flex items-center gap-2 md:col-span-2 md:justify-end">
          <button onClick={() => exportLane(x.id, false)} className="rounded bg-gray-700 px-2 py-1 text-xs text-white hover:bg-gray-600">Export</button>
          <a
            href={`/api/debugCrawl?origin=${encodeURIComponent(`${x.origin_city}, ${x.origin_state}`)}&dest=${encodeURIComponent(`${x.dest_city}, ${x.dest_state}`)}&equip=${encodeURIComponent(x.equipment_code)}&fill=0`}
            className="rounded bg-gray-700 px-2 py-1 text-xs text-white hover:bg-gray-600"
          >
            Preview
          </a>
          {showActions ? (
            <>
              {x.status !== "covered" && (
                <button onClick={() => setStatus(x.id, "covered")} className="rounded bg-amber-700 px-2 py-1 text-xs text-white hover:bg-amber-800">Mark Covered</button>
              )}
              {x.status === "pending" ? (
                <button onClick={() => setStatus(x.id, "posted")} className="rounded bg-blue-700 px-2 py-1 text-xs text-white hover:bg-blue-800">Mark Posted</button>
              ) : x.status === "posted" ? (
                <button onClick={() => setStatus(x.id, "pending")} className="rounded bg-blue-700 px-2 py-1 text-xs text-white hover:bg-blue-800">Unpost</button>
              ) : null}
              <button onClick={() => deleteLane(x.id)} className="rounded bg-red-700 px-2 py-1 text-xs text-white hover:bg-red-800">Delete</button>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <>
      <Head><title>Lanes — RapidRoutes</title></Head>
      <main className="mx-auto max-w-4xl p-6 text-gray-100">
        <h1 className="mb-2 text-2xl font-bold">Lanes</h1>

        <ExportBar />
        <CrawlPreviewBanner origin={origin} destination={destination} equipment={equipment} />

        <form onSubmit={submit} className="card p-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <CityAutocomplete label="Origin (City, ST)" value={origin} onChange={setOrigin} onPick={(c) => { setOriginState(c.state); setOriginZip(c.zip); }} />
            <CityAutocomplete label="Destination (City, ST)" value={destination} onChange={setDestination} onPick={(c) => { setDestState(c.state); setDestZip(c.zip); }} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Equipment (DAT code)</label>
              <EquipmentAutocomplete value={equipment} onChange={setEquipment} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Length (ft)</label>
              <input value={length} onChange={(e) => setLength(e.target.value.replace(/[^\d]/g, ""))} className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white" inputMode="numeric" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Pickup Earliest</label>
              <input type="date" value={pickupEarliest} onChange={(e) => setPickupEarliest(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Pickup Latest</label>
              <input type="date" value={pickupLatest} min={pickupEarliest || undefined} onChange={(e) => setPickupLatest(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Weight (lbs)</label>
              <div className="flex items-center gap-3">
                <input disabled={randomize} value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^\d]/g, ""))} className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white disabled:opacity-60" placeholder="e.g., 42500" inputMode="numeric" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={randomize} onChange={(e) => {
                    const on = e.target.checked;
                    setRandomize(on);
                    if (on && !range.min && sessionDefaultRange?.min) setRange(sessionDefaultRange);
                  }} />
                  Randomize
                </label>
                <button type="button" onClick={() => setOpenRand(true)} className="rounded bg-gray-700 px-3 py-2 text-sm hover:bg-gray-600">Set range</button>
              </div>
              {randomize && <div className="mt-2 text-xs text-gray-300">Range: {range.min || "—"}–{range.max || "—"} lbs</div>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-gray-400">Commodity (optional)</label>
                <input value={commodity} onChange={(e) => setCommodity(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white" placeholder="e.g., Lumber, Produce" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Comment (optional)</label>
                <input value={comment} onChange={(e) => setComment(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white" placeholder="Internal note — disappears when you type" />
              </div>
            </div>
          </div>

          {msg && <div className="text-sm text-red-400">{msg}</div>}

          <div className="flex items-center justify-between">
            <a href="/recap" className="text-sm text-blue-300 underline">Go to Recap</a>
            <button className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700">Save lane</button>
          </div>
        </form>

        <section className="mt-6">
          <div className="mb-2 flex items-center gap-2">
            <button onClick={() => setTab("pending")} className={`rounded px-3 py-1.5 text-sm ${tab === "pending" ? "bg-gray-700 text-white" : "bg-gray-800 text-gray-300"}`}>Pending</button>
            <button onClick={() => setTab("recent")} className={`rounded px-3 py-1.5 text-sm ${tab === "recent" ? "bg-gray-700 text-white" : "bg-gray-800 text-gray-300"}`}>Recent</button>
          </div>

          <div className="rounded-xl border border-gray-700">
            <div className="hidden grid-cols-12 gap-3 bg-gray-900 px-3 py-2 text-xs text-gray-400 md:grid">
              <div className="col-span-4">Lane</div>
              <div className="col-span-2">Pickup window</div>
              <div className="col-span-2">Equip / Len</div>
              <div className="col-span-2">Weight</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {loadingList && <div className="px-3 py-3 text-sm text-gray-300">Loading…</div>}
            {listError && <div className="px-3 py-3 text-sm text-red-400">{listError}</div>}
            {!loadingList && !(tab === "pending" ? pending.length : recent.length) && !listError && (
              <div className="px-3 py-3 text-sm text-gray-300">No lanes.</div>
            )}

            <div className="divide-y divide-gray-800">
              {(tab === "pending" ? pending : recent).map((x) => (
                <Row key={x.id} x={x} showActions={tab === "pending"} />
              ))}
            </div>
          </div>
        </section>

        <RandomizeWeightPopup
          open={openRand}
          initial={range}
          onClose={(p) => {
            setOpenRand(false);
            if (!p) return;
            setRandomize(true);
            setRange({ min: p.min, max: p.max });
            setWeight("");
            if (p.applyAll) setSessionDefaultRange({ min: p.min, max: p.max });
          }}
        />
      </main>
    </>
  );
}
