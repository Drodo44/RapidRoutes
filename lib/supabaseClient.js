import { createClient } from '@supabase/supabase-js';

// ---- Browser (anon) client — singleton
let browserClient = null;

export function getBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    console.error('Supabase client missing environment variables.');
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing');
  }

  if (!browserClient) {
    browserClient = createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'rr-auth', // avoids GoTrue collision with other clients
      },
      global: { headers: { 'x-rapidroutes-client': 'web' } },
    });
  }
  return browserClient;
}

// ---- Server (service role) client — NEVER import in client code
export function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server Supabase vars missing');
  return createClient(url, key, { auth: { persistSession: false } });
}

// Legacy exports for backward compatibility - gradually migrate away from these
export const supabase = typeof window !== 'undefined' 
  ? (() => { try { return getBrowserSupabase(); } catch { return null; } })()
  : null;

export const supabaseClient = supabase;

const RETRYABLE_STATUS = new Set([429]);
const RETRYABLE_CODES = new Set([
	"ECONNRESET",
	"ECONNABORTED",
	"ETIMEDOUT",
	"EAI_AGAIN",
	"ENOTFOUND"
]);

const BASE_DELAYS = [250, 600, 1200];

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(ms) {
	const factor = 0.8 + Math.random() * 0.4;
	return Math.round(ms * factor);
}

function parseStatus(err) {
	if (!err) return null;
	if (typeof err.status === "number") return err.status;
	if (typeof err.statusCode === "number") return err.statusCode;
	if (typeof err.code === "string" && /^\d+$/.test(err.code)) {
		return Number(err.code);
	}
	return null;
}

function isNetworkIssue(err) {
	if (!err) return false;
	if (RETRYABLE_CODES.has(err.code)) return true;
	const message = (err.message || "").toLowerCase();
	if (!message) return false;
	return (
		message.includes("fetch failed") ||
		message.includes("network") ||
		message.includes("timed out") ||
		message.includes("timeout") ||
		message.includes("aborted")
	);
}

function isRetryable(error) {
	if (!error) return false;
	const status = parseStatus(error);
	if (status && (status >= 500 || RETRYABLE_STATUS.has(status))) {
		return true;
	}
	return isNetworkIssue(error);
}

export async function withRetry(fn, label = "supabase-op") {
	let lastError;

	for (let attempt = 0; attempt <= BASE_DELAYS.length; attempt += 1) {
		try {
			const result = await fn();

			if (result && typeof result === "object" && result.error) {
				const enrichedError = {
					...result.error,
					status: result.status ?? result.error.status,
					statusText: result.statusText ?? result.error.statusText
				};
				lastError = enrichedError;
				if (attempt < BASE_DELAYS.length && isRetryable(enrichedError)) {
					const delay = jitter(BASE_DELAYS[attempt]);
					console.debug(`${label} retry ${attempt + 1} in ${delay}ms`);
					await sleep(delay);
					continue;
				}
				throw enrichedError;
			}

			if (attempt > 0) {
				console.debug(`${label} succeeded after ${attempt + 1} attempts`);
			}

			return result;
		} catch (error) {
					lastError = error;
					if (attempt >= BASE_DELAYS.length || !isRetryable(error)) {
						const message = error?.message || error?.status || "unknown";
						console.error(`${label} failed`, message);
				throw error;
			}

			const delay = jitter(BASE_DELAYS[attempt]);
					console.debug(`${label} transient failure, retry ${attempt + 1} in ${delay}ms`);
			await sleep(delay);
		}
	}

			const message = lastError?.message || lastError?.status || "unknown";
			console.error(`${label} exhausted retries`, message);
	throw lastError;
}

export default supabase;
