/**
 * Global kill switch + request de-dupe. Guarantees:
 * - no re-entrant actions within cooldown
 * - one in-flight network call per {method,url,body} key
 */
const cooldown = new Map(); // actionKey -> ts
const inflight = new Map(); // reqKey -> Promise

export function allowAction(key = "GLOBAL", ms = 10000) {
  const now = Date.now();
  const last = cooldown.get(key) ?? 0;
  if (now - last < ms) return false;
  cooldown.set(key, now);
  return true;
}

function hashBody(body) {
  try { return typeof body === "string" ? body : JSON.stringify(body||null); }
  catch { return "body-unhashable"; }
}

/** Dedupes fetches; identical in-flight calls share the same promise */
export async function dedupeFetch(input, init={}) {
  const url = typeof input === "string" ? input : input?.url || String(input);
  const method = (init.method || "GET").toUpperCase();
  const key = `${method}:${url}:${hashBody(init.body)}`;
  if (inflight.has(key)) return inflight.get(key);
  const p = (async () => {
    try { return await fetch(input, init); }
    finally { inflight.delete(key); }
  })();
  inflight.set(key, p);
  return p;
}