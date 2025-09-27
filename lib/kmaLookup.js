import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

let cache = null;
let loadErr = null;

function debugLog(...args) {
  if (process.env.PAIRING_DEBUG === '1') {
    console.log('[KMA_LOOKUP]', ...args);
  }
}

// Build mapping from 3-digit postal prefixes to KMA code + name (RateView file structure)
export async function getKmaMapping() {
  if (cache) return cache;
  if (loadErr) throw loadErr;
  const filename = 'KMA Zip RateView 3.0.xlsx';
  const filePath = path.join(process.cwd(), filename);
  if (!fs.existsSync(filePath)) {
    loadErr = new Error(`KMA Excel file missing: ${filename}`);
    throw loadErr;
  }
  try {
    const started = Date.now();
    const wb = xlsx.readFile(filePath, { cellDates: false });
    const sheetName = wb.SheetNames[0]; // 'Market zip definitions'
    const sheet = wb.Sheets[sheetName];
    const matrix = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
    if (!matrix.length) throw new Error('RATEVIEW_EMPTY_WORKBOOK');

    // Heuristic: header row usually index 2 (after title + blank)
    let headerRowIdx = 2;
    const headerProbeRegex = /market area id/i;
    if (!matrix[headerRowIdx] || !matrix[headerRowIdx].some(c => headerProbeRegex.test(String(c)))) {
      for (let i = 0; i < Math.min(matrix.length, 10); i++) {
        if (matrix[i] && matrix[i].some(c => headerProbeRegex.test(String(c)))) { headerRowIdx = i; break; }
      }
    }
    const headerRow = (matrix[headerRowIdx] || []).map(h => String(h).trim());
    const codeIdx = headerRow.findIndex(h => /market area id|kma code/i.test(h));
    const nameIdx = headerRow.findIndex(h => /market area name|kma name/i.test(h));
    const prefixAnchorIdx = headerRow.findIndex(h => /postal prefix list/i.test(h));
    if (codeIdx === -1 || nameIdx === -1 || prefixAnchorIdx === -1) {
      debugLog('Header indices not found', { codeIdx, nameIdx, prefixAnchorIdx, headerRow });
      throw new Error('RATEVIEW_HEADER_PARSE_FAILED');
    }

    const prefixMap = {}; // prefix -> {kma_code, kma_name}
    for (let r = headerRowIdx + 1; r < matrix.length; r++) {
      const row = matrix[r];
      if (!row || !row.length) continue;
      const codeRaw = (row[codeIdx] || '').toString().trim();
      if (!codeRaw || !/^[A-Z0-9_]+$/.test(codeRaw)) continue; // skip if malformed
      const nameRaw = (row[nameIdx] || '').toString().trim();
      for (let c = prefixAnchorIdx; c < row.length; c++) {
        const cell = (row[c] || '').toString().trim();
        if (!cell) continue;
        if (/canadian only past this point/i.test(cell)) break; // boundary sentinel
        const parts = cell.split(/[\s,]+/).map(p => p.trim()).filter(Boolean);
        for (const p of parts) {
          if (/^\d{3}$/.test(p)) {
            prefixMap[p] = { kma_code: codeRaw, kma_name: nameRaw || null };
          } else if (/^\d{5}$/.test(p)) {
            prefixMap[p.slice(0,3)] = { kma_code: codeRaw, kma_name: nameRaw || null };
          }
        }
      }
    }
    const prefixCount = Object.keys(prefixMap).length;
    if (prefixCount === 0) throw new Error('RATEVIEW_NO_PREFIXES_PARSED');
    cache = { _isPrefixMap: true, prefixes: prefixMap, sheet: sheetName, updated: new Date().toISOString() };
    debugLog('Loaded KMA prefix mapping', { prefixes: prefixCount, ms: Date.now() - started });
    return cache;
  } catch (err) {
    loadErr = err;
    throw err;
  }
}

