import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger";

export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

// Legacy export for backward compatibility
export const supabase = supabaseClient;

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
					logger.debug(`${label} retry ${attempt + 1} in ${delay}ms`);
					await sleep(delay);
					continue;
				}
				throw enrichedError;
			}

			if (attempt > 0) {
				logger.debug(`${label} succeeded after ${attempt + 1} attempts`);
			}

			return result;
		} catch (error) {
					lastError = error;
					if (attempt >= BASE_DELAYS.length || !isRetryable(error)) {
						const message = error?.message || error?.status || "unknown";
						logger.error(`${label} failed`, message);
				throw error;
			}

			const delay = jitter(BASE_DELAYS[attempt]);
					logger.debug(`${label} transient failure, retry ${attempt + 1} in ${delay}ms`);
			await sleep(delay);
		}
	}

			const message = lastError?.message || lastError?.status || "unknown";
			logger.error(`${label} exhausted retries`, message);
	throw lastError;
}

export default supabase;
