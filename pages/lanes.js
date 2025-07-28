import { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";

export default function Lanes() {
  const [lanes, setLanes] = useState([]);
  const [form, setForm] = useState({
    origin: "",
    originZip: "",
    destination: "",
    destinationZip: "",
    earliest: "",
    latest: "",
    equipment: "FD",
    length: 48,
    weight: 47000,
    randomize: true,
    weightMin: 46750,
    weightMax: 48000,
    notes: "",
  });
  const [showIntermodal, setShowIntermodal] = useState(false);
  const [currentLane, setCurrentLane] = useState(null);

  useEffect(() => {
    fetchLanes();
    const subscription = supabase
      .channel("lanes")
      .on("postgres_changes", { event: "*", schema: "public", table: "lanes" }, fetchLanes)
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchLanes = async () => {
    const { data } = await supabase.from("lanes").select("*").order("created_at", { ascending: false });
    setLanes(data || []);
  };

  const handleInput = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addLane = async () => {
    const { data, error } = await supabase.from("lanes").insert([form]).select().single();
    if (!error) {
      if (checkIntermodal(data)) {
        setCurrentLane(data);
        setShowIntermodal(true);
      }
      fetchLanes();
    }
  };

  const checkIntermodal = (lane) => {
    // Placeholder check logic (replace with your rules for Intermodal-eligible lanes)
    const distanceEligible = true; // add distance/market logic here
    return distanceEligible;
  };

  const markCovered = async (id) => {
    await supabase.from("lanes").update({ status: "covered" }).eq("id", id);
    fetchLanes();
  };

  const deleteLane = async (id) => {
    await supabase.from("lanes").delete().eq("id", id);
    fetchLanes();
  };

  const exportCSV = async () => {
    const res = await fetch("/api/exportDatCsv");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "DAT_Postings.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const intermodalFollowUp = async (choice) => {
    await supabase.from("lanes").update({ intermodal_status: choice }).eq("id", currentLane.id);
    setShowIntermodal(false);
    fetchLanes();
  };

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-4xl font-bold text-cyan-400 mb-4 drop-shadow">Lane Management</h1>

      {/* Lane Entry Form */}
      <div className="bg-[#141f35] p-6 rounded-lg shadow-cyan-glow space-y-4">
        <input name="origin" value={form.origin} onChange={handleInput} placeholder="Origin City, State" />
        <input name="originZip" value={form.originZip} onChange={handleInput} placeholder="Origin ZIP" />
        <input name="destination" value={form.destination} onChange={handleInput} placeholder="Destination City, State" />
        <input name="destinationZip" value={form.destinationZip} onChange={handleInput} placeholder="Destination ZIP" />
        <div className="flex space-x-4">
          <input type="date" name="earliest" value={form.earliest} onChange={handleInput} />
          <input type="date" name="latest" value={form.latest} onChange={handleInput} />
        </div>
        <div className="flex space-x-4">
          <select name="equipment" value={form.equipment} onChange={handleInput}>
            <option value="FD">Flatbed</option>
            <option value="SD">Stepdeck</option>
            <option value="RGN">RGN</option>
          </select>
          <input type="number" name="length" value={form.length} onChange={handleInput} placeholder="Length (ft)" />
        </div>
        <div className="flex space-x-4 items-center">
          <input type="number" name="weightMin" value={form.weightMin} onChange={handleInput} placeholder="Min Weight" />
          <input type="number" name="weightMax" value={form.weightMax} onChange={handleInput} placeholder="Max Weight" />
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={form.randomize} onChange={() => setForm({ ...form, randomize: !form.randomize })} />
            <span>Randomize Weights</span>
          </label>
        </div>
        <textarea name="notes" value={form.notes} onChange={handleInput} placeholder="Notes (AI can suggest if blank)" />
        <button onClick={addLane} className="bg-cyan-600 hover:bg-cyan-500 px-6 py-3 rounded-lg font-semibold">
          Add Lane
        </button>
      </div>

      {/* Lane Table */}
      <div className="bg-[#141f35] p-6 rounded-lg shadow-cyan-glow">
        <h2 className="text-2xl text-cyan-300 mb-4">Active Lanes</h2>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-cyan-500/30">
              <th>Origin</th>
              <th>Destination</th>
              <th>Equipment</th>
              <th>Weight</th>
              <th>Dates</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {lanes.map((lane) => (
              <tr key={lane.id} className="border-b border-cyan-500/20">
                <td>{lane.origin}</td>
                <td>{lane.destination}</td>
                <td>{lane.equipment}</td>
                <td>
                  {form.randomize
                    ? `${lane.weightMin}-${lane.weightMax} lbs`
                    : `${lane.weight} lbs`}
                </td>
                <td>{lane.earliest} – {lane.latest}</td>
                <td>{lane.status || "Active"}</td>
                <td className="space-x-2">
                  <button onClick={() => markCovered(lane.id)} className="text-green-400 hover:underline">Mark Covered</button>
                  <button onClick={() => deleteLane(lane.id)} className="text-red-400 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={exportCSV} className="mt-4 bg-cyan-600 hover:bg-cyan-500 px-6 py-3 rounded-lg font-semibold">
          Export DAT CSV
        </button>
      </div>

      {/* Intermodal Popup */}
      {showIntermodal && currentLane && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
          <div className="bg-[#101a2d] p-8 rounded-lg shadow-cyan-glow max-w-lg w-full space-y-4">
            <h2 className="text-2xl text-cyan-300">Intermodal Opportunity</h2>
            <p>This lane looks perfect for Intermodal. Copy the email below and send to your partner for a quote:</p>
            <textarea
              readOnly
              value={`Subject: Intermodal Opportunity (${currentLane.origin} – ${currentLane.destination})\n\nThis lane looks viable for Intermodal. Can you please quote this shipment?\n\nPickup City: ${currentLane.origin}\nPickup State:\nDelivery City: ${currentLane.destination}\nDelivery State:\nWeight: ${form.weight} lbs\nCommodity:\nDimensions / Pallet Count:\nPickup Date: ${form.earliest}\nTruck Rate:\n\nPlease let me know if you need any additional information. Thanks!`}
              className="w-full h-48"
            />
            <p className="text-sm text-gray-400">
              Timestamp saved. This quote request will be tracked.
            </p>
            <div className="flex justify-end space-x-4">
              <button onClick={() => intermodalFollowUp("yes")} className="text-green-400 hover:underline">Yes, Shipped Intermodal</button>
              <button onClick={() => intermodalFollowUp("expensive")} className="text-yellow-400 hover:underline">No, Too Expensive</button>
              <button onClick={() => intermodalFollowUp("noquote")} className="text-red-400 hover:underline">No Quote in Time</button>
              <button onClick={() => intermodalFollowUp("truckonly")} className="text-blue-400 hover:underline">Customer Prefers Truck</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
