// lib/equipmentSeed.js
// Authoritative, idempotent seed for equipment_codes.
// Add/adjust here; API bootstrap will upsert by code.

export const EQUIPMENT_SEED = [
  // Dry van / reefer / flatbed families
  { code: 'V',   label: 'Dry Van' },
  { code: 'DV',  label: 'Dry Van (Alt Code)' },
  { code: 'R',   label: 'Reefer' },
  { code: 'RV',  label: 'Reefer Van (Alt Code)' },
  { code: 'IR',  label: 'Insulated Van or Reefer' },
  { code: 'F',   label: 'Flatbed' },
  { code: 'FD',  label: 'Flatbed or Step Deck' },
  { code: 'SD',  label: 'Step Deck' },
  { code: 'DD',  label: 'Double Drop' },
  { code: 'DDX', label: 'Double Drop (Extended)' },
  { code: 'LB',  label: 'Lowboy' },
  { code: 'LBX', label: 'Lowboy (Extended)' },
  { code: 'RGN', label: 'Removable Gooseneck (RGN)' },
  { code: 'RG',  label: 'Removable Gooseneck (Alt)' },
  { code: 'FN',  label: 'Flatbed Conestoga' },
  { code: 'CN',  label: 'Conestoga' },
  { code: 'FA',  label: 'Flatbed Air-Ride' },
  { code: 'F2',  label: 'Flatbed Double' },
  { code: 'FZ',  label: 'Flatbed HazMat' },
  { code: 'FO',  label: 'Flatbed Over Dimension' },
  { code: 'FC',  label: 'Flatbed w/Chains' },
  { code: 'FS',  label: 'Flatbed w/Sides' },
  { code: 'FT',  label: 'Flatbed w/Tarps' },
  { code: 'FM',  label: 'Flatbed w/Team' },
  { code: 'MX',  label: 'Flatbed Maxi' },
  { code: 'FR',  label: 'Flatbed/Van/Reefer (Multi)' },

  // HazMat and OD
  { code: 'VZ',  label: 'Van HazMat' },
  { code: 'RZ',  label: 'Reefer HazMat' },
  { code: 'HZ',  label: 'HazMat (General)' },
  { code: 'XL',  label: 'Over Dimension (General)' },

  // Containers / intermodal
  { code: 'C',   label: 'Container' },
  { code: 'CI',  label: 'Container Insulated' },
  { code: 'CR',  label: 'Container Refrigerated' },
  { code: 'CH',  label: 'Chassis' },
  { code: 'IM',  label: 'Intermodal' },

  // Specialty trailers
  { code: 'DT',  label: 'Dump Trailer' },
  { code: 'ED',  label: 'End Dump' },
  { code: 'HB',  label: 'Hopper Bottom' },
  { code: 'WF',  label: 'Walking Floor / Live Bottom' },
  { code: 'LA',  label: 'Drop Deck Landoll' },
  { code: 'AC',  label: 'Auto Carrier' },
  { code: 'BT',  label: 'B-Train' },

  // Tankers
  { code: 'TN',  label: 'Tanker (Non-food)' },
  { code: 'TF',  label: 'Tanker (Food Grade)' },
  { code: 'PN',  label: 'Pneumatic Tank' },

  // Power only / straight / hotshot
  { code: 'PO',  label: 'Power Only' },
  { code: 'ST',  label: 'Straight Truck' },
  { code: 'HS',  label: 'Hotshot' },
  { code: 'PU',  label: 'Pickup Truck' },

  // Odds & ends
  { code: 'CV',  label: 'Conveyor' },
  { code: 'TR',  label: 'Trailer (Generic)' },
  { code: 'SDX', label: 'Step Deck (Extended)' },
  { code: 'FL',  label: 'Flatbed Light' },
  { code: 'FH',  label: 'Flatbed Hotshot' },
  { code: 'FSF', label: 'Flatbed w/Sides & Forklift' },
  { code: 'LO',  label: 'Lowboy Over Dimension' },
  { code: 'LR',  label: 'Lowboy or Rem Gooseneck (RGN)' }
];
