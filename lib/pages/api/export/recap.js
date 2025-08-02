// pages/api/export/recap.js
import ExcelJS from 'exceljs';
import { supabase } from '../../../utils/supabaseClient';

export default async function handler(req, res) {
  const { data: lanes, error } = await supabase.from('lanes').select('*');
  if (error) return res.status(500).send('Failed to fetch lanes');

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Active Postings');

  sheet.columns = [
    { header: 'Origin', key: 'origin', width: 20 },
    { header: 'Destination', key: 'destination', width: 20 },
    { header: 'Equipment', key: 'equipment', width: 12 },
    { header: 'Weight', key: 'weight', width: 10 },
    { header: 'Length', key: 'length', width: 10 },
    { header: 'Earliest', key: 'dateEarliest', width: 15 },
    { header: 'Latest', key: 'dateLatest', width: 15 },
    { header: 'Commodity', key: 'commodity', width: 20 },
  ];

  lanes.forEach((lane) => {
    sheet.addRow({
      origin: lane.origin,
      destination: lane.destination,
      equipment: lane.equipment,
      weight: lane.randomizeWeight
        ? `${lane.randomLow}-${lane.randomHigh}`
        : lane.baseWeight,
      length: lane.length,
      dateEarliest: lane.dateEarliest,
      dateLatest: lane.dateLatest,
      commodity: lane.commodity,
    });
  });

  sheet.getRow(1).font = { bold: true };
  sheet.eachRow((row, idx) => {
    if (idx > 1) row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: idx % 2 === 0 ? '1F2937' : '111827' },
    };
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=Active_Postings.xlsx');
  await workbook.xlsx.write(res);
  res.end();
}
