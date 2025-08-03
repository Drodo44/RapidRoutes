import { useState } from "react";

const fullEquipment = [
  "Auto Carrier AC","B-Train BT","Conestoga CN","Container C",
  "Container Insulated CI","Container Refrigerated CR","Conveyor CV",
  "Double Drop DD","Drop Deck Landoll LA","Dump Trailer DT",
  "Flatbed F","Flatbed Air-Ride FA","Flatbed Conestoga FN",
  "Flatbed Double F2","Flatbed HazMat FZ","Flatbed Hotshot FH",
  "Flatbed Maxi MX","Flatbed or Step Deck FD","Flatbed Over Dimension FO",
  "Flatbed w/Chains FC","Flatbed w/Sides FS","Flatbed w/Tarps FT",
  "Flatbed w/Team FM","Flatbed/Van/Reefer FR","Hopper Bottom HB",
  "Insulated Van or Reefer IR","Lowboy LB","Lowboy or RGN LR",
  "Lowboy Over Dimension LO","Reefer RF","Van V","Van Air-Ride VA",
  "Van HazMat VZ","Van Max-Load VX","Van Team VM"
];

export default function EquipmentSelect({ value, onChange }) {
  const [open,setOpen]=useState(false);
  const [filter,setFilter]=useState("");

  const list=fullEquipment.filter(e=>e.toLowerCase().includes(filter.toLowerCase()));

  return(
    <div className="relative">
      <input readOnly value={value}
        onClick={()=>setOpen(!open)}
        placeholder="Select equipment"
        className="w-full px-3 py-2 rounded bg-[#242933] border border-gray-700 text-sm cursor-pointer"
      />
      {open&&(
        <div className="absolute z-20 w-full bg-[#1E222B] border border-gray-700 rounded shadow-lg">
          <input autoFocus value={filter}
            onChange={e=>setFilter(e.target.value)}
            placeholder="Search…"
            className="w-full px-3 py-2 text-sm bg-[#1E222B] border-b border-gray-700 outline-none"
          />
          <ul className="max-h-60 overflow-y-auto">
            {list.map(e=>(
              <li key={e}
                onClick={()=>{onChange(e);setOpen(false);setFilter("");}}
                className="px-3 py-2 text-sm hover:bg-[#364db9] cursor-pointer">
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
