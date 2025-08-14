// pages/lanes.js
import { useState } from "react";
import Head from "next/head";
import { supabase } from "../utils/supabaseClient.js";
import CityAutocomplete from "../components/CityAutocomplete.js";
import EquipmentSelect from "../components/EquipmentSelect.js";
import RandomizeWeightPopup from "../components/RandomizeWeightPopup.js";

export default function LanesPage() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [equipment, setEquipment] = useState("V");
  const [length, setLength] = useState("53");
  const [randomize, setRandomize] = useState(false);
  const [weight, setWeight] = useState("");
  const [range, setRange] = useState({ min: "", max: "" });
  const [sessionDefaultRange, setSessionDefaultRange] = useState(null);
  const [openRand, setOpenRand] = useState(false);
  const [date, setDate] = useState("");
  const [fullPartial, setFullPartial] = useState("full");
  const [commodity, setCommodity] = useState("");
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState("");

  const openRandomize = () => {
    const init = randomize
      ? { min: range.min || sessionDefaultRange?.min || "", max: range.max || sessionDefaultRange?.max || "" }
      : { min: sessionDefaultRange?.min || "", max: sessionDefaultRange?.max || "" };
    setOpenRand(true);
  };

  const onCloseRand = (payload) => {
    setOpenRand(false);
    if (!payload) return;
    setRandomize(true);
    setRange({ min: payload.min, max: payload.max });
    setWeight("");
    if (payload.applyAll) setSessionDefaultRange({ min: payload.min, max: payload.max });
  };

  async function submit(e) {
    e.preventDefault();
    setMsg("");

    // Validation
    if (!origin || !destination) return setMsg("Origin and Destination are required.");
    if (!equipment) return setMsg("Equipment code is required.");
    const L = Number(length);
    if (!Number.isFinite(L) || L <= 0) return setMsg("Length must be a positive number.");
    if (randomize) {
      const mi = Number(range.min), ma = Number(range.max);
      if (!Number.isFinite(mi) || !Number.isFinite(ma) || mi <= 0 || ma < mi)
        return setMsg("Enter a valid weight range.");
    } else {
      const W = Number(weight);
      if (!Number.isFinite(W) || W <= 0) return setMsg("Weight is required.");
    }

    const row = {
      origin,                // "City, ST" — used by export planner
      destination,           // "City, ST"
      equipment,             // DAT code
      length: Number(length),
      randomize_weight: !!randomize,
      weight: randomize ? null : Number(weight),
      weight_min: randomize ? Number(range.min) : null,
      weight_max: randomize ? Number(range.max) : null,
      date,
      full_partial: fullPartial,
      commodity: commodity || null,
      comment: comment || null,
      status: "active",
    };

    const { error } = await supabase.from("lanes").insert(row);
    if (error) return setMsg(error.message || "Failed to save lane.");

    setMsg("Lane saved.");
    // Reset except keep session default weight range
    setOrigin(""); setDestination(""); setEquipment("V"); setLength("53");
    setRandomize(false); setWeight(""); setRange({ min: sessionDefaultRange?.min || "", max: sessionDefaultRange?.max || "" });
    setDate(""); setFullPartial("full"); setCommodity(""); setComment("");
  }

  return (
    <>
      <Head><title>Lanes — RapidRoutes</title></Head>
      <main className="mx-auto max-w-4xl p-6 text-gray-100">
        <h1 className="mb-4 text-2xl font-bold">Create Lane</h1>
        <form onSubmit={submit} className="card p-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <CityAutocomplete label="Origin (City, ST)" value={origin} onChange={setOrigin} />
            <CityAutocomplete label="Destination (City, ST)" value={destination} onChange={setDestination} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Equipment (DAT code)</label>
              <EquipmentSelect value={equipment} onChange={setEquipment} />
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Pickup Date (e.g., 8/12/2025)</label>
              <input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="MM/DD/YYYY or text"
                className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Full / Partial</label>
              <select
                value={fullPartial}
                onChange={(e) => setFullPartial(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white"
              >
                <option value="full">full</option>
                <option value="partial">partial</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Weight (lbs)</label>
              <div className="flex items-center gap-3">
                <input
                  disabled={randomize}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value.replace(/[^\d]/g, ""))}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white disabled:opacity-60"
                  placeholder={randomize ? "" : "e.g., 42500"}
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
                  onClick={openRandomize}
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
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Comment (optional)</label>
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white"
                />
              </div>
            </div>
          </div>

          {msg && <div className="text-sm text-red-400">{msg}</div>}

          <div className="flex justify-end">
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
