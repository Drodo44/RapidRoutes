-- Complete DAT Equipment Types - ALL official equipment types from DAT specification
-- Source: https://www.dat.com/wp-content/uploads/2021/02/postsearchreference.pdf
-- Run this SQL in Supabase to add all missing DAT equipment types

-- Use UPSERT (INSERT ... ON CONFLICT) to avoid duplicates
INSERT INTO equipment_codes (code, label, "group") VALUES

-- Auto Carriers
('AC', 'Auto Carrier', 'Auto Carrier'),
('A2', 'Auto Carrier Double', 'Auto Carrier'),

-- B-Trains
('BT', 'B-Train', 'B-Train'),

-- Conestoga
('CN', 'Conestoga', 'Conestoga'),
('C2', 'Conestoga Double', 'Conestoga'),

-- Containers
('C', 'Container', 'Container'),
('CI', 'Container Insulated', 'Container'),
('CR', 'Container Refrigerated', 'Container'),
('CV', 'Conveyor', 'Specialized'),

-- Double Drop
('DD', 'Double Drop', 'Specialized'),
('D2', 'Double Drop Double', 'Specialized'),

-- Dump
('DT', 'Dump Trailer', 'Dump'),

-- Flatbed Family
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
('FR', 'Flatbed/Van/Reefer', 'Multi-Purpose'),

-- Hopper
('HB', 'Hopper Bottom', 'Hopper'),
('HO', 'Hopper Open', 'Hopper'),

-- HazMat
('HZ', 'Hazardous Materials', 'HazMat'),

-- Insulated
('IR', 'Insulated Van or Reefer', 'Insulated'),

-- Landoll
('LA', 'Drop Deck Landoll', 'Specialized'),

-- Lowboy Family
('LB', 'Lowboy', 'Lowboy'),
('LR', 'Lowboy or Rem Gooseneck (RGN)', 'Lowboy'),
('LO', 'Lowboy Overdimension', 'Lowboy'),
('LK', 'Lowboy King', 'Lowboy'),
('LX', 'Lowboy Extended', 'Lowboy'),

-- Moving Van
('MV', 'Moving Van', 'Moving Van'),
('MA', 'Moving Van Air-Ride', 'Moving Van'),

-- Pneumatic
('NU', 'Pneumatic', 'Pneumatic'),

-- Open Top
('OT', 'Van Open-Top', 'Van'),

-- Power Only
('PO', 'Power Only', 'Power Only'),
('PL', 'Power Only Load Out', 'Power Only'),
('PT', 'Power Only Tow Away', 'Power Only'),

-- Reefer Family
('R', 'Reefer', 'Reefer'),
('RA', 'Reefer Air-Ride', 'Reefer'),
('R2', 'Reefer Double', 'Reefer'),
('RN', 'Reefer Intermodal', 'Reefer'),
('RL', 'Reefer Logistics', 'Reefer'),
('RV', 'Reefer or Vented Van', 'Reefer'),
('RP', 'Reefer Pallet Exchange', 'Reefer'),
('RM', 'Reefer w/Team', 'Reefer'),
('RZ', 'Reefer HazMat', 'Reefer'),

-- Removable Gooseneck
('RG', 'Removable Gooseneck', 'RGN'),

-- Step Deck Family  
('SD', 'Step Deck', 'Step Deck'),
('SR', 'Step Deck or Rem Gooseneck (RGN)', 'Step Deck'),
('SN', 'Stepdeck Conestoga', 'Step Deck'),

-- Straight Box Truck Family - CRITICAL FOR BROKERS
('SB', 'Straight Box Truck', 'Box Truck'),
('BZ', 'Straight Box Truck HazMat', 'Box Truck'),
('BR', 'Straight Box Truck Reefer', 'Box Truck'),

-- Sprinter Van Family
('SV', 'Sprinter Van', 'Sprinter Van'),
('SZ', 'Sprinter Van HazMat', 'Sprinter Van'),
('SC', 'Sprinter Van Temp-Controlled', 'Sprinter Van'),
('SM', 'Sprinter Van w/Team', 'Sprinter Van'),

-- Stretch
('ST', 'Stretch Trailer', 'Stretch'),

-- Tanker Family
('TA', 'Tanker Aluminum', 'Tanker'),
('TN', 'Tanker Intermodal', 'Tanker'),
('TS', 'Tanker Steel', 'Tanker'),

-- Truck and Trailer
('TT', 'Truck and Trailer', 'Truck and Trailer'),

-- Van Family - MOST COMMON
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
('VF', 'Van or Flatbed', 'Multi-Purpose'),
('VT', 'Van or Flatbed w/Tarps', 'Multi-Purpose'),
('VR', 'Van or Reefer', 'Multi-Purpose'),
('VP', 'Van Pallet Exchange', 'Van'),
('VB', 'Van Roller Bed', 'Van'),
('V3', 'Van Triple', 'Van'),
('VV', 'Van Vented', 'Van'),
('VC', 'Van w/Curtains', 'Van'),
('VM', 'Van w/Team', 'Van')

-- Handle conflicts by updating the label if code already exists
ON CONFLICT (code) 
DO UPDATE SET 
  label = EXCLUDED.label,
  "group" = EXCLUDED."group";

-- Verification query to show results
SELECT 
  "group",
  COUNT(*) as equipment_count,
  STRING_AGG(code, ', ' ORDER BY code) as codes
FROM equipment_codes 
GROUP BY "group" 
ORDER BY "group";

-- Show total count
SELECT COUNT(*) as total_equipment_types FROM equipment_codes;

-- Show critical equipment types for brokers
SELECT code, label, "group" 
FROM equipment_codes 
WHERE code IN ('SB', 'V', 'R', 'F', 'FD', 'SD', 'AC', 'BT', 'CN', 'LB', 'TA')
ORDER BY code;
