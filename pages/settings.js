import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function Settings() {
  const [blocklist, setBlocklist] = useState([]);
  const [newZip, setNewZip] = useState("");

  useEffect(() => {
    fetchBlocklist();
  }, []);

  const fetchBlocklist = async () => {
    const { data } = await supabase.from("blocklists").select("*");
    setBlocklist(data || []);
  };

  const addZip = async () => {
    await supabase.from("blocklists").insert([{ zip: newZip }]);
    setNewZip("");
    fetchBlocklist();
  };

  const removeZip = async (id) => {
    await supabase.from("blocklists").delete().eq("id", id);
    fetchBlocklist();
  };

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-cyan-400 drop-shadow mb-6">Settings</h1>
      <div className="bg-[#141f35] p-6 rounded-lg shadow-cyan-glow">
        <h2 className="text-xl text-cyan-300 mb-4">Blocked ZIP/KMA List</h2>
        <div className="flex space-x-4 mb-4">
          <input
            value={newZip}
            onChange={(e) => setNewZip(e.target.value)}
            placeholder="Enter ZIP"
          />
          <button onClick={addZip} className="bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded-lg">
            Add ZIP
          </button>
        </div>
        <ul className="space-y-2">
          {blocklist.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span>{item.zip}</span>
              <button onClick={() => removeZip(item.id)} className="text-red-400 hover:underline">
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
