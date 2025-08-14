// pages/api/health.js
import { adminSupabase as supabase } from "../../utils/supabaseClient.js";

async function checkEnv() {
  const keys = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  const missing = keys.filter((k) => !process.env[k]);
  return { ok: missing.length === 0, missing };
}

async function checkTable(name) {
  try {
    const { error } = await supabase.from(name).select("*", { count: "exact", head: true });
    return { ok: !error, error: error?.message || null };
  } catch (e) {
    return { ok: false, error: e.message || "unknown error" };
  }
}

async function checkStorage(bucket) {
  try {
    const { data, error } = await supabase.storage.from(bucket).list("", { limit: 1 });
    if (error && error.message?.toLowerCase().includes("not found")) {
      return { ok: false, error: "Bucket missing (create 'dat_maps')" };
    }
    return { ok: !error, error: error?.message || null, sample: data?.[0]?.name || null };
  } catch (e) {
    return { ok: false, error: e.message || "unknown error" };
  }
}

async function checkRpc() {
  try {
    // Try calling RPC with a harmless radius; if it doesn't exist, Supabase returns error
    const { data, error } = await supabase.rpc("fetch_nearby_cities", {
      i_lat: 33.0,
      i_lon: -86.9,
      i_radius_miles: 10,
      i_equipment: "V",
      i_expand_if_needed: false,
      i_max: 3,
    });
    if (error) return { ok: false, error: error.message || "RPC call failed" };
    return { ok: Array.isArray(data), sampleCount: data?.length ?? 0 };
  } catch (e) {
    return { ok: false, error: e.message || "unknown error" };
  }
}

async function checkExportHead(params = "") {
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/exportDatCsv${params}`, { method: "HEAD" });
    // If NEXT_PUBLIC_BASE_URL is not set, do local path in Vercel env (works in prod)
    if (!r.ok) throw new Error(`HEAD ${params} -> ${r.status}`);
    const parts = Number(r.headers.get("X-Total-Parts") || "1");
    return { ok: true, parts: Number.isFinite(parts) ? parts : 1 };
  } catch (e) {
    // Fallback: try relative path (works at runtime)
    try {
      const r2 = await fetch(`/api/exportDatCsv${params}`, { method: "HEAD" });
      if (!r2.ok) throw new Error(`HEAD(rel) ${params} -> ${r2.status}`);
      const parts = Number(r2.headers.get("X-Total-Parts") || "1");
      return { ok: true, parts: Number.isFinite(parts) ? parts : 1 };
    } catch (e2) {
      return { ok: false, error: e2.message || e.message };
    }
  }
}

export default async function handler(_req, res) {
  try {
    const env = await checkEnv();
    const tables = await Promise.all([
      "cities",
      "lanes",
      "rates_snapshots",
      "rates_flat",
      "dat_maps",
      "settings",
      "user_prefs",
    ].map(async (t) => ({ table: t, ...(await checkTable(t)) })));

    const storage = await checkStorage("dat_maps");
    const rpc = await checkRpc();
    const exportHead = await checkExportHead("?all=1");

    const ok =
      env.ok &&
      tables.every((t) => t.ok) &&
      storage.ok &&
      rpc.ok &&
      exportHead.ok;

    return res.status(ok ? 200 : 500).json({
      ok,
      env,
      tables,
      storage,
      rpc,
      exportHead,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "health failed" });
  }
}
