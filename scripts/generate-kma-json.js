#!/usr/bin/env node
/**
 * Generate precomputed KMA prefix JSON from RateView Excel file.
 * Output: lib/data/kmaPrefixMap.json
 */
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';

const EXCEL_FILE = 'KMA Zip RateView 3.0.xlsx';
const OUTPUT_FILE = path.join(process.cwd(), 'lib', 'data', 'kmaPrefixMap.json');

function log(...args) { console.log('[KMA_JSON_GEN]', ...args); }

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function buildPrefixMap() {
  const filePath = path.join(process.cwd(), EXCEL_FILE);
  if (!fs.existsSync(filePath)) throw new Error(`Excel file not found: ${EXCEL_FILE}`);
  const wb = xlsx.readFile(filePath, { cellDates: false });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const matrix = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  if (!matrix.length) throw new Error('Empty workbook');

  let headerRowIdx = 2;
  const headerProbe = /market area id/i;
  if (!matrix[headerRowIdx] || !matrix[headerRowIdx].some(c => headerProbe.test(String(c)))) {
    for (let i = 0; i < Math.min(12, matrix.length); i++) {
      if (matrix[i] && matrix[i].some(c => headerProbe.test(String(c)))) { headerRowIdx = i; break; }
    }
  }
  const header = (matrix[headerRowIdx] || []).map(h => String(h).trim());
  const codeIdx = header.findIndex(h => /market area id|kma code/i.test(h));
  const nameIdx = header.findIndex(h => /market area name|kma name/i.test(h));
  const prefixAnchorIdx = header.findIndex(h => /postal prefix list/i.test(h));
  if (codeIdx === -1 || nameIdx === -1 || prefixAnchorIdx === -1) {
    throw new Error('Required header columns not found.');
  }

  const prefixMap = {};
  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || !row.length) continue;
    const code = (row[codeIdx] || '').toString().trim();
    if (!code || !/^[A-Z0-9_]+$/.test(code)) continue;
    const name = (row[nameIdx] || '').toString().trim();
    for (let c = prefixAnchorIdx; c < row.length; c++) {
      const cell = (row[c] || '').toString().trim();
      if (!cell) continue;
      if (/canadian only past this point/i.test(cell)) break;
      const parts = cell.split(/[\s,]+/).map(p => p.trim()).filter(Boolean);
      for (const p of parts) {
        if (/^\d{3}$/.test(p)) {
          prefixMap[p] = { kma_code: code, kma_name: name || null };
        } else if (/^\d{5}$/.test(p)) {
          prefixMap[p.slice(0,3)] = { kma_code: code, kma_name: name || null };
        }
      }
    }
  }
  const count = Object.keys(prefixMap).length;
  if (count < 150) throw new Error(`Parsed too few prefixes (${count})`);
  return { _isPrefixMap: true, prefixes: prefixMap, sourceSheet: sheetName, generatedAt: new Date().toISOString(), entries: count };
}

try {
  log('Starting generation');
  const mapping = buildPrefixMap();
  ensureDir(OUTPUT_FILE);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mapping, null, 2));
  log(`Wrote ${mapping.entries} prefixes to ${OUTPUT_FILE}`);
} catch (err) {
  console.error('[KMA_JSON_GEN] FAILED', err.message);
  process.exit(1);
}
