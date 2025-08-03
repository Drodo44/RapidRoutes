import { useState } from "react";

/*  Full DAT equipment master — pulled from the official PDF & Help Center  */
const fullEquipment = [
  // ——— A ———
  "Auto Carrier AC",
  // ——— B ———
  "B-Train BT",
  "Blanket Wrap Van VW",
  // ——— C ———
  "Conestoga CN",
  "Container C",
  "Container Insulated CI",
  "Container Refrigerated CR",
  "Conveyor CV",
  // ——— D ———
  "Double Drop DD",
  "Drop Deck Landoll LA",
  "Dump Trailer DT",
  // ——— F ———
  "Flatbed F",
  "Flatbed Air-Ride FA",
  "Flatbed Conestoga FN",
  "Flatbed Double F2",
  "Flatbed HazMat FZ",
  "Flatbed Hotshot FH",
  "Flatbed Maxi MX",
  "Flatbed or Step Deck FD",
  "Flatbed Over Dimension FO",
  "Flatbed w/Chains FC",
  "Flatbed w/Sides FS",
  "Flatbed w/Tarps FT",
  "Flatbed w/Team FM",
  "Flatbed/Van/Reefer FR",
  // ——— H ———
  "Hopper Bottom HB",
  // ——— I ———
  "Insulated Van or Reefer IR",
  // ——— K ———
  "Removable Gooseneck RG",
  "Step Deck or RGN SR",
  "Stepdeck Conestoga SN",
  "Stretch Trailer ST",
  // ——— L ———
  "Lowboy LB",
  "Lowboy or RGN LR",
  "Lowboy Over Dimension LO",
  // ——— M ———
  "Moving Van MV",
  // ——— N ———
  "Pneumatic NU",
  // ——— P ———
  "Power Only PO",
  "Power Only Load-Out PL",
  "Power Only Tow-Away PT",
  // ——— R ———
  "Reefer R",
  "Reefer Air-Ride RA",
  "Reefer Double R2",
  "Reefer HazMat RZ",
  "Reefer Intermodal RN",
  "Reefer Logistics RL",
  "Reefer or Vented Van RV",
  "Reefer Pallet Exchange RP",
  "Reefer w/Team RM",
  // ——— S ———
  "Sprinter Van SV",
  "Sprinter Van HazMat SZ",
  "Sprinter Van Temp-Controlled SC",
  "Sprinter Van w/Team SM",
  "Straight Box Truck SB",
  "Straight Box Truck HazMat BZ",
  "Straight Box Truck Reefer BR",
  "Step Deck SD",
  "Tanker Aluminum TA",
  "Tanker Intermodal TN",
  "Tanker Steel TS",
  // ——— T ———
  "Truck and Trailer TT",
  // ——— V ———
  "Van V / Dry Van V",
  "Van Air-Ride VA",
  "Van Blanket Wrap VW",
  "Van Conestoga VS",
  "Van Double V2",
  "Van HazMat VZ",
  "Van Hotshot VH",
  "Van Insulated VI",
  "Van Intermodal VN",
  "Van Lift-Gate VG",
  "Van Logistics VL",
  "Van Open-Top OT",
  "Van Roller Bed VB",
  "Van Triple V3",
  "Van Vented VV",
  "Van w/Curtains VC",
  "Van w/Team VM",
  // ——— X ———
  "Van Max-Load VX",
];

/*  Searchable combobox  */
export default function EquipmentSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const shown = fullEquipment.filter((e) =>
    e.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="relative">
      <input
        readOnly
        value={value}
        onClick={() => setOpen(!open)}
        placeholder="Select equipment"
        className="w-full px-3 py-2 rounded bg-[#242933] border border-gray-700 text-sm cursor-pointer"
      />

      {open && (
        <div className="absolute z-20 w-full bg-[#1E222B] border border-gray-700 rounded shadow-lg">
          <input
            autoFocus
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search equipment…"
            className="w-full px-3 py-2 text-sm bg-[#1E222B] border-b border-gray-700 outline-none"
          />
          <ul className="max-h-64 overflow-y-auto">
            {shown.map((e) => (
              <li
                key={e}
                onClick={() => {
                  onChange(e);
                  setOpen(false);
                  setFilter("");
                }}
                className="px-3 py-2 text-sm hover:bg-[#364db9] cursor-pointer"
              >
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
