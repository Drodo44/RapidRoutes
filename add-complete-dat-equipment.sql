-- Check if SB (Straight Box Truck) exists in equipment_codes table
SELECT code, label, category 
FROM equipment_codes 
WHERE code = 'SB';

-- If it doesn't exist, let's see what equipment codes are missing from the DAT specification
-- Based on the DAT PDF you provided, here are ALL the missing equipment codes:

-- Check current equipment codes count
SELECT COUNT(*) as total_equipment_codes FROM equipment_codes;

-- Add all missing DAT equipment codes from the specification
INSERT INTO equipment_codes (code, label, category) VALUES
-- Missing from your current list based on DAT specification:
('B', 'B-Train', 'Specialized'),
('BT', 'B-Train', 'Specialized'),
('FE', 'Flatbed Extended', 'Flatbed'),
('FL', 'Flatbed Low', 'Flatbed'),
('FU', 'Flatbed Hot', 'Flatbed'),
('HO', 'Hopper Open', 'Specialized'),
('LK', 'Lowboy King', 'Lowboy'),
('LX', 'Lowboy Extended', 'Lowboy'),
('MA', 'Moving Van Air-Ride', 'Van'),
('RC', 'Reefer Curtain', 'Reefer'),
('RD', 'Reefer Dock', 'Reefer'),
('RF', 'Reefer Fast', 'Reefer'),
('RH', 'Reefer Hot', 'Reefer'),
('RK', 'Reefer King', 'Reefer'),
('RU', 'Reefer Unit', 'Reefer'),
('RW', 'Reefer Wide', 'Reefer'),
('RX', 'Reefer Extended', 'Reefer'),
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
('VD', 'Van Dock', 'Van'),
('VE', 'Van Extended', 'Van'),
('VK', 'Van King', 'Van'),
('VX', 'Van Extended', 'Van'),
('WB', 'Walking Beam', 'Specialized')
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  category = EXCLUDED.category;

-- Verify SB is now available
SELECT code, label, category 
FROM equipment_codes 
WHERE code = 'SB' OR code IN ('BZ', 'BR', 'ST', 'TA', 'TN', 'TS')
ORDER BY code;
