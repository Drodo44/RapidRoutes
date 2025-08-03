import { useState } from "react";
import CityAutocomplete from "../components/CityAutocomplete";
import EquipmentSelect from "../components/EquipmentSelect";
import RandomizeModal from "../components/RandomizeModal";

const newLane=()=>({
  origin:"",destination:"",earliest:"",latest:"",
  equipment:"",length:"",weight:"",rate:"",randomize:false,comment:""
});
const rand=(min,max)=>Math.floor(Math.random()*(max-min+1))+min;

export default function Lanes(){
  const[lanes,setLanes]=useState([newLane()]);
  const[showModal,setShowModal]=useState(null);

  const upd=(i,f,v)=>setLanes(p=>p.map((l,idx)=>idx===i?{...l,[f]:v}:l));

  const applyRand=(min,max,all)=>setLanes(p=>p.map((l,idx)=>(
    all||idx===showModal?{...l,weight:rand(min,max),randomize:true}:l
  )));

  return(
    <div className="min-h-screen bg-[#14181F] text-[#E2E8F0] py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Lane Entry</h1>

      {lanes.map((l,i)=>(
        <div key={i} className="mb-8 space-y-4 p-5 rounded-lg border border-gray-800 bg-[#1E222B]">

          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="text-sm font-semibold">Origin</label>
              <CityAutocomplete value={l.origin} onChange={v=>upd(i,"origin",v)} placeholder="City, State" />
            </div>
            <div><label className="text-sm font-semibold">Destination</label>
              <CityAutocomplete value={l.destination} onChange={v=>upd(i,"destination",v)} placeholder="City, State" />
            </div>
            <div><label className="text-sm font-semibold">Earliest Pickup Date</label>
              <input type="date" value={l.earliest} onChange={e=>upd(i,"earliest",e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#242933] border border-gray-700 text-sm" />
            </div>
            <div><label className="text-sm font-semibold">Latest Pickup Date</label>
              <input type="date" value={l.latest} onChange={e=>upd(i,"latest",e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#242933] border border-gray-700 text-sm" />
            </div>
            <div><label className="text-sm font-semibold">Equipment</label>
              <EquipmentSelect value={l.equipment} onChange={v=>upd(i,"equipment",v)} />
            </div>
            <div><label className="text-sm font-semibold">Length (ft)</label>
              <input type="number" value={l.length} onChange={e=>upd(i,"length",e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#242933] border border-gray-700 text-sm" />
            </div>
            <div>
              <label className="text-sm font-semibold">Weight (lbs)</label>
              <div className="flex items-center gap-3">
                <input type="number" value={l.weight} onChange={e=>upd(i,"weight",e.target.value)}
                  className="flex-1 px-3 py-2 rounded bg-[#242933] border border-gray-700 text-sm" />
                <input type="checkbox" checked={l.randomize}
                  onChange={e=>{ if(e.target.checked) setShowModal(i); else upd(i,"randomize",false); }}
                  className="h-4 w-4" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold">Rate ($)</label>
              <input type="number" value={l.rate} onChange={e=>upd(i,"rate",e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#242933] border border-gray-700 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold">Comment</label>
            <textarea rows={2} value={l.comment} onChange={e=>upd(i,"comment",e.target.value)}
              placeholder="Reminder: You are posting to your email AND phone. Per DAT’s policy, any postings with Email / Phone Number typed in the comment box are auto-deleted."
              className="w-full px-3 py-2 rounded bg-[#242933] border border-gray-700 italic placeholder-gray-400 text-sm" />
          </div>

          <button onClick={()=>setLanes(lanes.filter((_,idx)=>idx!==i))}
            className="text-red-500 hover:text-red-400 text-sm font-semibold">Remove Lane</button>
        </div>
      ))}

      <button onClick={()=>setLanes([...lanes,newLane()])}
        className="px-6 py-3 rounded-xl bg-[#4361EE] hover:bg-[#364db9] font-semibold shadow-lg">Add New Lane</button>

      {/* Randomize modal */}
      <RandomizeModal show={showModal!==null} onClose={()=>setShowModal(null)} apply={applyRand} />
    </div>
  );
}
