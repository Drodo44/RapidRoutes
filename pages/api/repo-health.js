// pages/api/repo-health.js
// Purpose: one-stop repo + DB health check so you know everything is wired correctly.

import fs from "node:fs/promises";
import path from "node:path";

function ok(name, note = "") { return { name, ok: true, note }; }
function bad(name, note) { return { name, ok: false, note }; }

export default async function handler(_req, res) {
  const checks = [];

  // ---- Files & module exports ------------------------------------------------
  async function checkModule(rel, requiredExports = []) {
    const abs = path.join(process.cwd(), rel);
  let supabaseAdmin;
    try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
      await fs.access(abs);
    } catch {
      checks.push(bad(`File exists: ${rel}`, "Missing file"));
      return null;
    }
    try {
      // dynamic import works with ESM .js
      const mod = await import(pathToFileURL(abs).href);
      const missing = requiredExports.filter((k) => !(k in mod));
      if (missing.length) {
        checks.push(bad(`Exports in ${rel}`, `Missing export(s): ${missing.join(", ")}`));
      } else {
        checks.push(ok(`Exports in ${rel}`, requiredExports.join(", ")));
      }
      return mod;
    } catch (e) {
      checks.push(bad(`Import ${rel}`, e.message));
      return null;
    }
  }
  function pathToFileURL(p) {
    const u = new URL(`file://${p.replace(/\\/g, "/")}`);
    return u;
  }

  // lib/datCsvBuilder.js
  let datCsv = null;
  try {
    datCsv = await checkModule("lib/datCsvBuilder.js", [
      "DAT_HEADERS",
      "rowsFromBaseAndPairs",
      "planPairsForLane",
      "toCsv",
      "chunkRows",
    ]);
    if (datCsv?.DAT_HEADERS) {
      const len = Array.isArray(datCsv.DAT_HEADERS) ? datCsv.DAT_HEADERS.length : 0;
      if (len !== 24) {
        checks.push(bad("DAT headers length", `Expected 24, got ${len}`));
      } else {
        checks.push(ok("DAT headers length is 24"));
      }
      // Spot-check a few exact column names
      const must = [
        "Pickup Earliest*","Length (ft)*","Weight (lbs)*","Equipment*",
        "Use DAT Loadboard*","Contact Method*","Origin City*","Destination City*","Reference ID",
      ];
      const missing = must.filter((h) => !datCsv.DAT_HEADERS.includes(h));
      if (missing.length) checks.push(bad("DAT headers names", `Missing: ${missing.join(", ")}`));
      else checks.push(ok("DAT header names include key fields"));
    }
  } catch { /* already recorded */ }

  // API routes loadable?
  await checkModule("pages/api/exportDatCsv.js", ["default"]);
  await checkModule("pages/api/exportLaneCsv.js", ["default"]);
  await checkModule("pages/api/cities.js", ["default"]);

  // Equipment picker present?
  await checkModule("components/EquipmentAutocomplete.js");
  await checkModule("components/CityAutocomplete.js");
  await checkModule("components/RandomizeWeightPopup.js");
  await checkModule("components/Nav.js");

  // _app.js wraps Nav?
  await checkModule("pages/_app.js");

  // pages exist?
  const pages = [
    "pages/index.js","pages/login.js","pages/dashboard.js","pages/lanes.js",
    "pages/recap.js","pages/market-data.js","pages/profile.js",
  ];
  for (const p of pages) {
    try { await fs.access(path.join(process.cwd(), p)); checks.push(ok(`File exists: ${p}`)); }
    catch { checks.push(bad(`File exists: ${p}`, "Missing file")); }
  }

  // package.json sanity
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(process.cwd(), "package.json"), "utf8"));
    const hasNext = pkg.dependencies?.next || pkg.devDependencies?.next;
    if (!hasNext) checks.push(bad("package.json has Next", "Missing next in dependencies"));
    else checks.push(ok("package.json has Next", String(hasNext)));
  } catch (e) {
    checks.push(bad("Read package.json", e.message));
  }

  // ---- DB schema probes (fail → tells you which column is missing) ----------
  async function probeColumns(table, cols) {
    // We attempt a select for specific columns; Supabase returns an error when any column doesn't exist
    const colList = cols.join(", ");
    try {
      const { error } = await supabase.from(table).select(colList).limit(1);
      if (error) {
        const msg = error.message || String(error);
        // try to extract missing column name from message
        checks.push(bad(`${table} columns`, msg));
      } else {
        checks.push(ok(`${table} columns`, colList));
      }
    } catch (e) {
      checks.push(bad(`${table} columns`, e.message));
    }
  }

  await probeColumns("cities", [
    "city","state_or_province","zip","latitude","longitude","kma_code","kma_name"
  ]);

  await probeColumns("lanes", [
    "origin_city","origin_state","origin_zip",
    "dest_city","dest_state","dest_zip",
    "equipment_code","length_ft",
    "randomize_weight","weight_lbs","weight_min","weight_max",
    "full_partial","pickup_earliest","pickup_latest",
    "commodity","comment","status","created_at","id"
  ]);

  // ---- Result ----------------------------------------------------------------
  const okAll = checks.every((c) => c.ok);
  res.status(okAll ? 200 : 207).json({ ok: okAll, checks });
}
