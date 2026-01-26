// Complete DAT Equipment Types - ALL equipment types from DAT specification  
export const equipmentOptions = [
  // Auto Carriers
  { label: "Auto Carrier", value: "AC" },
  { label: "Auto Carrier Double", value: "A2" },

  // B-Trains
  { label: "B-Train", value: "BT" },

  // Conestoga
  { label: "Conestoga", value: "CN" },
  { label: "Conestoga Double", value: "C2" },

  // Containers
  { label: "Container", value: "C" },
  { label: "Container Insulated", value: "CI" },
  { label: "Container Refrigerated", value: "CR" },
  { label: "Conveyor", value: "CV" },

  // Decks - Specialized
  { label: "Double Drop", value: "DD" },
  { label: "Double Drop Double", value: "D2" },
  { label: "Drop Deck Landoll", value: "LA" },
  { label: "Dump Trailer", value: "DT" },

  // Flatbeds
  { label: "Flatbed", value: "F" },
  { label: "Flatbed Air-Ride", value: "FA" },
  { label: "Flatbed Double", value: "F2" },
  { label: "Flatbed Conestoga", value: "FN" },
  { label: "Flatbed or Step Deck", value: "FD" },
  { label: "Flatbed Overdimension", value: "FO" },
  { label: "Flatbed w/Chains", value: "FC" },
  { label: "Flatbed w/Sides", value: "FS" },
  { label: "Flatbed w/Tarps", value: "FT" },
  { label: "Flatbed w/Team", value: "FM" },
  { label: "Flatbed HazMat", value: "FZ" },
  { label: "Flatbed Hotshot", value: "FH" },
  { label: "Flatbed Maxi", value: "MX" },
  { label: "Flatbed Extended", value: "FE" },
  { label: "Flatbed Low", value: "FL" },

  // Flatbed/Van/Reefer
  { label: "Flatbed/Van/Reefer", value: "FR" },

  // DryBulk
  { label: "Hopper Bottom", value: "HB" },
  { label: "Hopper Open", value: "HO" },
  { label: "Pneumatic", value: "NU" },

  // Hazardous Materials
  { label: "Hazardous Materials", value: "HZ" },

  // Insulated/Reefers
  { label: "Insulated Van or Reefer", value: "IR" },

  // Lowboys
  { label: "Lowboy", value: "LB" },
  { label: "Lowboy or Rem Gooseneck (RGN)", value: "LR" },
  { label: "Lowboy Overdimension", value: "LO" },
  { label: "Lowboy King", value: "LK" },
  { label: "Lowboy Extended", value: "LX" },

  // Moving Vans
  { label: "Moving Van", value: "MV" },
  { label: "Moving Van Air-Ride", value: "MA" },

  // Power Only
  { label: "Power Only", value: "PO" },
  { label: "Power Only Load Out", value: "PL" },
  { label: "Power Only Tow Away", value: "PT" },

  // Reefers
  { label: "Reefer", value: "R" },
  { label: "Reefer Air-Ride", value: "RA" },
  { label: "Reefer Double", value: "R2" },
  { label: "Reefer Intermodal", value: "RN" },
  { label: "Reefer Logistics", value: "RL" },
  { label: "Reefer or Vented Van", value: "RV" },
  { label: "Reefer Pallet Exchange", value: "RP" },
  { label: "Reefer w/Team", value: "RM" },
  { label: "Reefer HazMat", value: "RZ" },

  // Removable Gooseneck
  { label: "Removable Gooseneck", value: "RG" },

  // Sprinter Vans
  { label: "Sprinter Van", value: "SV" },
  { label: "Sprinter Van HazMat", value: "SZ" },
  { label: "Sprinter Van Temp-Controlled", value: "SC" },
  { label: "Sprinter Van w/Team", value: "SM" },

  // Step Decks
  { label: "Step Deck", value: "SD" },
  { label: "Step Deck or Rem Gooseneck (RGN)", value: "SR" },
  { label: "Stepdeck Conestoga", value: "SN" },

  // Straight Box Trucks
  { label: "Straight Box Truck", value: "SB" },
  { label: "Straight Box Truck HazMat", value: "BZ" },
  { label: "Straight Box Truck Reefer", value: "BR" },

  // Stretch
  { label: "Stretch Trailer", value: "ST" },

  // Tankers
  { label: "Tanker Aluminum", value: "TA" },
  { label: "Tanker Intermodal", value: "TN" },
  { label: "Tanker Steel", value: "TS" },

  // Truck and Trailer
  { label: "Truck and Trailer", value: "TT" },

  // Vans - Standard
  { label: "Van", value: "V" },
  { label: "Van Air-Ride", value: "VA" },
  { label: "Van Blanket Wrap", value: "VW" },
  { label: "Van Conestoga", value: "VS" },
  { label: "Van Double", value: "V2" },
  { label: "Van HazMat", value: "VZ" },
  { label: "Van Hotshot", value: "VH" },
  { label: "Van Insulated", value: "VI" },
  { label: "Van Intermodal", value: "VN" },
  { label: "Van Lift-Gate", value: "VG" },
  { label: "Van Logistics", value: "VL" },
  { label: "Van Open-Top", value: "OT" },
  { label: "Van or Flatbed", value: "VF" },
  { label: "Van or Flatbed w/Tarps", value: "VT" },
  { label: "Van or Reefer", value: "VR" },
  { label: "Van Pallet Exchange", value: "VP" },
  { label: "Van Roller Bed", value: "VB" },
  { label: "Van Triple", value: "V3" },
  { label: "Van Vented", value: "VV" },
  { label: "Van w/Curtains", value: "VC" },
  { label: "Van w/Team", value: "VM" }
];
