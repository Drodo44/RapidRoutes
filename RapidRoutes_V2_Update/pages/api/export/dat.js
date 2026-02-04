// pages/api/export/dat.js
// ❌ DEPRECATED AND BROKEN - DO NOT USE
// This endpoint has been disabled due to critical CSV corruption issues
// Use /api/exportDatCsv or /api/exportLaneCsv instead

export default async function handler(req, res) {
  console.error('❌ CRITICAL: Attempted to use broken CSV export endpoint /api/export/dat');
  console.error('This endpoint generates corrupted CSV data with dummy/fake content');
  console.error('Use /api/exportDatCsv or /api/exportLaneCsv instead');
  
  return res.status(410).json({ 
    error: 'This CSV export endpoint is deprecated and broken',
    message: 'Use /api/exportDatCsv for bulk exports or /api/exportLaneCsv for single lane exports',
    deprecated: true,
    corruption_risk: 'This endpoint generates fake CSV data and should never be used'
  });
}
