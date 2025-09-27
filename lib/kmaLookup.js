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

    // Detect column names heuristically (multi-pass):
    const first = rows[0];
    const keysRaw = Object.keys(first);
    const keys = keysRaw.map(k => k.trim());
    const lowerKeys = keys.map(k => k.toLowerCase());
    const findKey = (patterns) => {
      for (const p of patterns) {
        const idx = lowerKeys.findIndex(lk => lk === p || lk.includes(p));
        if (idx !== -1) return keys[idx];
      }
      return null;
    };
    let zipCol = findKey(['zip', 'zip code', 'zipcode', 'postal', 'postal code']);
    let kmaCodeCol = findKey(['kma code', 'kma_code', 'kma', 'kma id']);
    let kmaNameCol = findKey(['kma name', 'market', 'market name']);

    // Heuristic fallback for zip: choose column where majority of non-empty values are 5-digit numbers
    if (!zipCol) {
      for (const candidate of keys) {
        const sample = rows.slice(0, 50).map(r => String(r[candidate] || '').trim()).filter(Boolean);
        if (!sample.length) continue;
        const digit5 = sample.filter(v => /^\d{5}$/.test(v)).length;
        if (digit5 > sample.length * 0.6) { zipCol = candidate; break; }
      }
    }
    // Heuristic fallback for kma code: uppercase-ish short tokens
    if (!kmaCodeCol) {
      for (const candidate of keys) {
        const sample = rows.slice(0, 50).map(r => String(r[candidate] || '').trim()).filter(Boolean);
        if (!sample.length) continue;
        const looksLikeCode = sample.filter(v => /^[A-Z0-9]{2,8}$/.test(v)).length;
        if (looksLikeCode > sample.length * 0.5) { kmaCodeCol = candidate; break; }
      }
    }
    if (!zipCol || !kmaCodeCol) {
      debugLog('KMA column detection failure', { keys, zipCol, kmaCodeCol });
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
