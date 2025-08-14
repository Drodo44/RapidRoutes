// pages/lanes.js
import { useState } from "react";
import Head from "next/head";
import { supabase } from "../utils/supabaseClient.js";
import CityAutocomplete from "../components/CityAutocomplete.js";
import EquipmentAutocomplete from "../components/EquipmentAutocomplete.js";
import RandomizeWeightPopup from "../components/RandomizeWeightPopup.js";
import ExportBar from "../components/ExportBar.js";
import CrawlPreviewBanner from "../components/CrawlPreviewBanner.js";

export default function LanesPage() {
  // Visible fields
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

  // Hidden fields fed by autocomplete
  const [originState, setOriginState] = useState("");
  const [originZip, setOriginZip] = useState("");
  const [destState, setDestState] = useState("");
  const [destZip, setDestZip] = useState("");

  const onCloseRand = (payload) => {
    setOpenRand(false);
    if (!payload) return;
    setRandomize(true);
    setRange({ min: payload.min, max: payload.max });
    setWeight("");
    if (payload.applyAll) setSessionDefaultRange({ min: payload.min, max: payload.max });
  };

  function validate() {
    if (!origin || !destination) return "Origin and Destination are required.";
    if (!equipment) return "Equipment code is required.";
    const L = Number(length);
    if (!Number.isFinite(L) || L <= 0) return "Length must be a positive number.";
    if (!pickupEarliest) return "Pickup Earliest is required.";
    if (!pickupLatest) return "Pickup Latest is required.";
    if (randomize) {
      const mi = Number(range.min), ma = Number(range.max);
      if (!Number.isFinite(mi) || !Number.isFinite(ma) || mi <= 0 || ma < mi) return "Enter a valid weight range.";
    } else {
      const W = Number(weight);
      if (!Number.isFinite(W) || W <= 0) return "Weight is required.";
    }
    return "";
  }

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    const err = validate();
    if (err) return setMsg(err);

    // For backward compatibility, also store a friendly "date" string
    const datePretty = pickupEarliest && pickupLatest
      ? (pickupEarliest === pickupLatest ? fmtUS(pickupEarliest) : `${fmtUS(pickupEarliest)}–${fmtUS(pickupLatest)}`)
      : "";

    const row = {
      // What you type/see
      origin, destination,
      equipment, length: Number(length),
      randomize_weight: !!randomize,
      weight: randomize ? null : Number(weight),
      weight_min: randomize ? Number(range.min) : null,
      weight_max: randomize ? Number(range.max) : null,
      full_partial: fullPartial,
      commodity: commodity || null,
      comment: comment || null,
      status: "active",

      // New: explicit pieces for export quality
      origin_state: originState || guessState(origin),
      origin_zip: originZip || null,
      dest_state: destState || guessState(destination),
      dest_zip: destZip || null,
      pickup_earliest: pickupEarliest || null, // "YYYY-MM-DD" from <input type="date">
      pickup_latest: pickupLatest || null,
      date: datePretty || null,
    };

    const { error } = await supabase.from("lanes").insert(row);
    if (error) return setMsg(error.message || "Failed to save lane.");

    setMsg("Lane saved.");
    // Reset, but keep session weight defaults
    setOrigin(""); setDestination(""); setEquipment("V"); setLength("53");
    setPickupEarliest(""); setPickupLatest("");
    setRandomize(false); setWeight(""); setRange({ min: sessionDefaultRange?.min || "", max: sessionDefaultRange?.max || "" });
    setFullPartial("full"); setCommodity(""); setComment("");
    setOriginState(""); setOriginZip(""); setDestState(""); setDestZip("");
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
            <CityAutocomplete
              label="Origin (City, ST)"
              value={origin}
              onChange={setOrigin}
              onPick={(c) => { setOriginState(c.state); setOriginZip(c.zip); }}
            />
            <CityAutocomplete
              label="Destination (City, ST)"
              value={destination}
              onChange={setDestination}
              onPick={(c) => { setDestState(c.state); setDestZip(c.zip); }}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Equipment (DAT code)</label>
              <EquipmentAutocomplete value={equipment} onChange={setEquipment} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Length (ft)</label>
              <input
                value={length}
                onChange={(e) => setLength(e.target.value.replace(/[^\d]/g, ""))}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white"
                inputMode="numeric"
              />
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Pickup Earliest</label>
              <input
                type="date"
                value={pickupEarliest}
                onChange={(e) => setPickupEarliest(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Pickup Latest</label>
              <input
                type="date"
                value={pickupLatest}
                min={pickupEarliest || undefined}
                onChange={(e) => setPickupLatest(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white"
              />
            </div>
          </div>

          {/* Weight / randomize */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Weight (lbs)</label>
              <div className="flex items-center gap-3">
                <input
                  disabled={randomize}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value.replace(/[^\d]/g, ""))}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white disabled:opacity-60"
                  placeholder="e.g., 42500"
                  inputMode="numeric"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={randomize}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setRandomize(on);
                      if (on && !range.min && sessionDefaultRange?.min) setRange(sessionDefaultRange);
                    }}
                  />
                  Randomize
                </label>
                <button
                  type="button"
                  onClick={() => setOpenRand(true)}
                  className="rounded bg-gray-700 px-3 py-2 text-sm hover:bg-gray-600"
                >
                  Set range
                </button>
              </div>
              {randomize && (
                <div className="mt-2 text-xs text-gray-300">
                  Range: {range.min || "—"}–{range.max || "—"} lbs
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-gray-400">Commodity (optional)</label>
                <input
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white"
                  placeholder="e.g., Lumber, Produce"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Comment (optional)</label>
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white"
                  placeholder="Internal note — disappears when you type"
                />
              </div>
            </div>
          </div>

          {msg && <div className="text-sm text-red-400">{msg}</div>}

          <div className="flex items-center justify-between">
            <a href="/recap" className="text-sm text-blue-300 underline">Go to Recap</a>
            <button className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700">
              Save lane
            </button>
          </div>
        </form>

        <RandomizeWeightPopup open={openRand} initial={range} onClose={onCloseRand} />
      </main>
    </>
  );
}

function fmtUS(iso) {
  // "YYYY-MM-DD" -> "M/D/YYYY"
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${m}/${d}/${y}`;
}

function guessState(cityCommaState) {
  const parts = String(cityCommaState || "").split(",").map((s) => s.trim());
  return parts[1] || "";
}
