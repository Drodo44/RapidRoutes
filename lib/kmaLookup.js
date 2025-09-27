import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

let kmaCache = null; // { zip: { kma_code, kma_name } }
let loadError = null;

function debugLog(...args) {
  if (process.env.PAIRING_DEBUG === '1') {
    console.log('[KMA_LOOKUP]', ...args);
  }
}

function normalizeZip(raw) {
  if (!raw) return null;
  const z = String(raw).trim();
  if (!z) return null;
  // Handle ZIP+4 by taking first 5 digits
  const m = z.match(/^(\d{5})/);
  return m ? m[1] : null;
}

export async function getKmaMapping() {
  if (kmaCache) return kmaCache;
  if (loadError) throw loadError;
  const filename = 'KMA Zip RateView 3.0.xlsx';
  const filePath = path.join(process.cwd(), filename);
  if (!fs.existsSync(filePath)) {
    loadError = new Error(`KMA Excel file missing: ${filename}`);
    throw loadError;
  }
  try {
    const started = Date.now();
    const wb = xlsx.readFile(filePath, { cellDates: false });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    if (!rows.length) throw new Error('KMA workbook empty');

    // Detect column names heuristically
    const first = rows[0];
    const keys = Object.keys(first).map(k => k.trim());
    const findKey = (patterns) => {
      const lowerKeys = keys.map(k => k.toLowerCase());
      for (const p of patterns) {
        const idx = lowerKeys.findIndex(lk => lk === p || lk.includes(p));
        if (idx !== -1) return keys[idx];
      }
      return null;
    };
    const zipCol = findKey(['zip', 'postal']);
    const kmaCodeCol = findKey(['kma code', 'kma_code', 'kma']);
    const kmaNameCol = findKey(['kma name', 'market']);

    if (!zipCol || !kmaCodeCol) {
      throw new Error(`Unable to detect necessary columns (zipCol=${zipCol}, kmaCodeCol=${kmaCodeCol})`);
    }

    const map = {};
    for (const row of rows) {
      const zip = normalizeZip(row[zipCol]);
      if (!zip) continue;
      const kma_code = String(row[kmaCodeCol] || '').trim();
      if (!kma_code) continue;
      const kma_name = kmaNameCol ? String(row[kmaNameCol] || '').trim() : '';
      map[zip] = { kma_code, kma_name };
    }
    kmaCache = map;
    debugLog('Loaded KMA mapping', { entries: Object.keys(map).length, ms: Date.now() - started });
    return kmaCache;
  } catch (err) {
    loadError = err;
    throw err;
  }
}
