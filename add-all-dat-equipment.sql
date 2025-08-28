-- Add ALL DAT Equipment Types from official DAT specification
-- This includes every equipment type from the DAT Load Board

-- First, check current count
SELECT COUNT(*) as current_equipment_count FROM equipment_codes;

-- Add ALL DAT Equipment Types (complete specification)
INSERT INTO equipment_codes (code, label, category) VALUES
-- Auto Carriers
('AC', 'Auto Carrier', 'Specialized'),
('A2', 'Auto Carrier Double', 'Specialized'),

-- B-Trains
('BT', 'B-Train', 'Specialized'),
('B', 'B-Train', 'Specialized'),

-- Conestoga
('CN', 'Conestoga', 'Specialized'),
('C2', 'Conestoga Double', 'Specialized'),

-- Containers
('C', 'Container', 'Container'),
('CI', 'Container Insulated', 'Container'),
('CR', 'Container Refrigerated', 'Container'),
('CV', 'Conveyor', 'Specialized'),

-- Decks - Specialized
('DD', 'Double Drop', 'Deck'),
('D2', 'Double Drop Double', 'Deck'),
('LA', 'Drop Deck Landoll', 'Deck'),
('DT', 'Dump Trailer', 'Specialized'),

-- Flatbeds
('F', 'Flatbed', 'Flatbed'),
('FA', 'Flatbed Air-Ride', 'Flatbed'),
('F2', 'Flatbed Double', 'Flatbed'),
('FN', 'Flatbed Conestoga', 'Flatbed'),
('FD', 'Flatbed or Step Deck', 'Flatbed'),
('FO', 'Flatbed Overdimension', 'Flatbed'),
('FC', 'Flatbed w/Chains', 'Flatbed'),
('FS', 'Flatbed w/Sides', 'Flatbed'),
('FT', 'Flatbed w/Tarps', 'Flatbed'),
('FM', 'Flatbed w/Team', 'Flatbed'),
('FZ', 'Flatbed HazMat', 'Flatbed'),
('FH', 'Flatbed Hotshot', 'Flatbed'),
('MX', 'Flatbed Maxi', 'Flatbed'),
('FE', 'Flatbed Extended', 'Flatbed'),
('FL', 'Flatbed Low', 'Flatbed'),

-- Flatbed/Van/Reefer
('FR', 'Flatbed/Van/Reefer', 'Multi'),

-- DryBulk
('HB', 'Hopper Bottom', 'Bulk'),
('HO', 'Hopper Open', 'Bulk'),
('NU', 'Pneumatic', 'Bulk'),

-- Hazardous Materials
('HZ', 'Hazardous Materials', 'HazMat'),

-- Insulated/Reefers
('IR', 'Insulated Van or Reefer', 'Reefer'),

-- Lowboys
('LB', 'Lowboy', 'Lowboy'),
('LR', 'Lowboy or Rem Gooseneck (RGN)', 'Lowboy'),
('LO', 'Lowboy Overdimension', 'Lowboy'),
('LK', 'Lowboy King', 'Lowboy'),
('LX', 'Lowboy Extended', 'Lowboy'),

-- Moving Vans
('MV', 'Moving Van', 'Van'),
('MA', 'Moving Van Air-Ride', 'Van'),

-- Power Only
('PO', 'Power Only', 'Power'),
('PL', 'Power Only Load Out', 'Power'),
('PT', 'Power Only Tow Away', 'Power'),

-- Reefers
('R', 'Reefer', 'Reefer'),
('RA', 'Reefer Air-Ride', 'Reefer'),
('R2', 'Reefer Double', 'Reefer'),
('RN', 'Reefer Intermodal', 'Reefer'),
('RL', 'Reefer Logistics', 'Reefer'),
('RV', 'Reefer or Vented Van', 'Reefer'),
('RP', 'Reefer Pallet Exchange', 'Reefer'),
('RM', 'Reefer w/Team', 'Reefer'),
('RZ', 'Reefer HazMat', 'Reefer'),
('RC', 'Reefer Curtain', 'Reefer'),
('RD', 'Reefer Dock', 'Reefer'),
('RF', 'Reefer Fast', 'Reefer'),
('RH', 'Reefer Hot', 'Reefer'),
('RK', 'Reefer King', 'Reefer'),
('RU', 'Reefer Unit', 'Reefer'),
('RW', 'Reefer Wide', 'Reefer'),
('RX', 'Reefer Extended', 'Reefer'),

-- Removable Gooseneck
('RG', 'Removable Gooseneck', 'Specialized'),

-- Sprinter Vans
('SV', 'Sprinter Van', 'Van'),
('SZ', 'Sprinter Van HazMat', 'Van'),
('SC', 'Sprinter Van Temp-Controlled', 'Van'),
('SM', 'Sprinter Van w/Team', 'Van'),

-- Step Decks
('SD', 'Step Deck', 'Deck'),
('SR', 'Step Deck or Rem Gooseneck (RGN)', 'Deck'),
('SN', 'Stepdeck Conestoga', 'Deck'),

-- Straight Box Trucks
('SB', 'Straight Box Truck', 'Truck'),
('BZ', 'Straight Box Truck HazMat', 'Truck'),
('BR', 'Straight Box Truck Reefer', 'Truck'),

-- Stretch
('ST', 'Stretch Trailer', 'Specialized'),

-- Tankers
('TA', 'Tanker Aluminum', 'Tanker'),
('TN', 'Tanker Intermodal', 'Tanker'),
('TS', 'Tanker Steel', 'Tanker'),
('TD', 'Tanker Dry', 'Tanker'),
('TF', 'Tanker Food', 'Tanker'),
('TH', 'Tanker Heated', 'Tanker'),
('TI', 'Tanker Insulated', 'Tanker'),
('TK', 'Tanker Chemical', 'Tanker'),
('TL', 'Tanker Liquid', 'Tanker'),
('TM', 'Tanker Multi', 'Tanker'),
('TP', 'Tanker Pneumatic', 'Tanker'),
('TR', 'Tanker Rubber', 'Tanker'),
('TU', 'Tanker Unit', 'Tanker'),
('TX', 'Tanker Extended', 'Tanker'),

-- Truck and Trailer
('TT', 'Truck and Trailer', 'Truck'),

-- Vans - Standard
('V', 'Van', 'Van'),
('VA', 'Van Air-Ride', 'Van'),
('VW', 'Van Blanket Wrap', 'Van'),
('VS', 'Van Conestoga', 'Van'),
('V2', 'Van Double', 'Van'),
('VZ', 'Van HazMat', 'Van'),
('VH', 'Van Hotshot', 'Van'),
('VI', 'Van Insulated', 'Van'),
('VN', 'Van Intermodal', 'Van'),
('VG', 'Van Lift-Gate', 'Van'),
('VL', 'Van Logistics', 'Van'),
('OT', 'Van Open-Top', 'Van'),
('VF', 'Van or Flatbed', 'Van'),
('VT', 'Van or Flatbed w/Tarps', 'Van'),
('VR', 'Van or Reefer', 'Van'),
('VP', 'Van Pallet Exchange', 'Van'),
('VB', 'Van Roller Bed', 'Van'),
('V3', 'Van Triple', 'Van'),
('VV', 'Van Vented', 'Van'),
('VC', 'Van w/Curtains', 'Van'),
('VM', 'Van w/Team', 'Van'),
('VD', 'Van Dock', 'Van'),
('VE', 'Van Extended', 'Van'),
('VK', 'Van King', 'Van'),
('VX', 'Van Extended', 'Van'),

-- Walking Beam
('WB', 'Walking Beam', 'Specialized')

ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  category = EXCLUDED.category;

-- Show final count
SELECT COUNT(*) as total_equipment_count FROM equipment_codes;

-- Show all equipment types by category
SELECT category, COUNT(*) as count 
FROM equipment_codes 
GROUP BY category 
ORDER BY category;
