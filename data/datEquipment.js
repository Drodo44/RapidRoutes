// data/datEquipment.js
// Extended DAT-style equipment list. CSV will always use the DAT `code`.
// You can add/remove items here safely.
export const DAT_EQUIPMENT = [
  // Core trailers
  { code: "V",    label: "Dry Van",                group: "Van & Box" },
  { code: "VNT",  label: "Vented Van",             group: "Van & Box" },
  { code: "BOX",  label: "Box Truck / Straight",   group: "Van & Box" },
  { code: "SPRV", label: "Sprinter Van / Cargo",   group: "Van & Box" },

  { code: "R",    label: "Reefer (Refrigerated)",  group: "Reefer" },
  { code: "RFS",  label: "Reefer (Food Service)",  group: "Reefer" },
  { code: "RVENT",label: "Vented Reefer",          group: "Reefer" },

  { code: "F",    label: "Flatbed",                group: "Flatbed & Deck" },
  { code: "FT",   label: "Flatbed (Tarped)",       group: "Flatbed & Deck" },
  { code: "SD",   label: "Step Deck",              group: "Flatbed & Deck" },
  { code: "DD",   label: "Double Drop",            group: "Flatbed & Deck" },
  { code: "RGN",  label: "RGN (Removable Gooseneck)", group: "Flatbed & Deck" },
  { code: "LBY",  label: "Lowboy",                 group: "Flatbed & Deck" },
  { code: "STRETCHF", label: "Stretch Flatbed",    group: "Flatbed & Deck" },
  { code: "STRETCHSD",label: "Stretch Step Deck",  group: "Flatbed & Deck" },
  { code: "CONEST",   label: "Conestoga",          group: "Flatbed & Deck" },
  { code: "CURT", label: "Curtain Side",           group: "Flatbed & Deck" },
  { code: "PIPE", label: "Pipe Stakes",            group: "Flatbed & Deck" },

  // Dumps / hoppers
  { code: "ED",   label: "End Dump",               group: "Dump & Bulk" },
  { code: "BD",   label: "Bottom Dump",            group: "Dump & Bulk" },
  { code: "SDMP", label: "Side Dump",              group: "Dump & Bulk" },
  { code: "LIVEB",label: "Live Bottom (Belt)",     group: "Dump & Bulk" },
  { code: "HB",   label: "Hopper Bottom",          group: "Dump & Bulk" },

  // Tank
  { code: "T",    label: "Tanker (General)",       group: "Tank" },
  { code: "TFG",  label: "Tanker — Food Grade",    group: "Tank" },
  { code: "TFUEL",label: "Tanker — Fuel",          group: "Tank" },
  { code: "TCHEM",label: "Tanker — Chemical",      group: "Tank" },
  { code: "TAC",  label: "Tanker — Asphalt/Crude", group: "Tank" },
  { code: "PNEU", label: "Pneumatic Tank",         group: "Tank" },

  // Specialized / heavy
  { code: "HVY",  label: "Heavy Haul / Oversize",  group: "Specialized" },
  { code: "OD",   label: "Over-Dimensional",       group: "Specialized" },
  { code: "SWTCH",label: "Switcher / Yard Jockey", group: "Specialized" },
  { code: "LIV",  label: "Livestock",              group: "Specialized" },
  { code: "LOG",  label: "Logging",                group: "Specialized" },
  { code: "DGN",  label: "Drop-Nose (Specialty)",  group: "Specialized" },
  { code: "PRTL", label: "Partial / LTL",          group: "Specialized" },
  { code: "HOT",  label: "Hotshot (Gooseneck)",    group: "Specialized" },
  { code: "CAR",  label: "Auto Hauler",            group: "Specialized" },

  // Intermodal / containers
  { code: "IMDL", label: "Intermodal",             group: "Intermodal & Container" },
  { code: "C20",  label: "Container 20’",          group: "Intermodal & Container" },
  { code: "C40",  label: "Container 40’",          group: "Intermodal & Container" },
  { code: "C45",  label: "Container 45’",          group: "Intermodal & Container" },
  { code: "CHAS", label: "Container Chassis",      group: "Intermodal & Container" },
  { code: "GENS", label: "GenSet (Reefer)",        group: "Intermodal & Container" },

  // Power only & misc
  { code: "P",    label: "Power Only",             group: "Power Only & Misc" },
  { code: "POF",  label: "Power Only (Flat)",      group: "Power Only & Misc" },
  { code: "POR",  label: "Power Only (Reefer)",    group: "Power Only & Misc" },
  { code: "POV",  label: "Power Only (Van)",       group: "Power Only & Misc" },
  { code: "UTL",  label: "Utility / Specialty",    group: "Power Only & Misc" },

  // Regional/common aliases — keep for broker familiarity
  { code: "FB",   label: "Flatbed (alias)",        group: "Aliases" },
  { code: "SDD",  label: "Single Dropdeck (alias)",group: "Aliases" },
  { code: "DDROP",label: "Double Drop (alias)",    group: "Aliases" },
  { code: "REEF", label: "Reefer (alias)",         group: "Aliases" },
  { code: "DRY",  label: "Dry Van (alias)",        group: "Aliases" },
  { code: "STEP", label: "Step Deck (alias)",      group: "Aliases" },
  { code: "CONES",label: "Conestoga (alias)",      group: "Aliases" },

  // Additions (keep growing as needed)
  { code: "BALE", label: "Baled Commodities",      group: "Specialized" },
  { code: "DUMP", label: "Dump Trailer (General)", group: "Dump & Bulk" },
  { code: "STAK", label: "Stake Bed",              group: "Van & Box" },
  { code: "MFG",  label: "Micro/City Van",         group: "Van & Box" },
  { code: "REF",  label: "Refined Products",       group: "Tank" },
  { code: "CHEM", label: "Chemicals",              group: "Tank" },
  { code: "WASTE",label: "Waste/Refuse",           group: "Specialized" },
  { code: "MAIL", label: "Postal / Mail",          group: "Van & Box" },
  { code: "PHA",  label: "Pharma (Temp Control)",  group: "Reefer" },
  { code: "BEV",  label: "Beverage",               group: "Van & Box" },
  { code: "FOOD", label: "Food Service",           group: "Reefer" },
  { code: "ICE",  label: "Ice / Frozen",           group: "Reefer" },
  { code: "GLS",  label: "Glass Racks",            group: "Flatbed & Deck" },
  { code: "COIL", label: "Coil Rack",              group: "Flatbed & Deck" },
  { code: "BRICK",label: "Brick / Block",          group: "Flatbed & Deck" },
  { code: "STEEL",label: "Steel",                  group: "Flatbed & Deck" },
  { code: "LUM",  label: "Lumber",                 group: "Flatbed & Deck" },
  { code: "AG",   label: "Ag Equipment",           group: "Specialized" },
  { code: "CNST", label: "Construction",           group: "Specialized" }
];
// Note: Brokers can still type any DAT code — this list powers labels & suggestions.
