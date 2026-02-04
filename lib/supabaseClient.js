import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Environment Variable Resolution with Fallbacks
// ============================================================================

/**
 * Resolves Supabase URL with fallback logic
 * Tries NEXT_PUBLIC_SUPABASE_URL first (works in both browser and server)
 * Falls back to SUPABASE_URL for server-side only scenarios
 */
function resolveSupabaseUrl() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

    if (!url) {
        console.error('[Supabase Config] Missing Supabase URL in environment variables');
        console.error('[Supabase Config] Expected: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
        throw new Error('Supabase URL not configured. Check environment variables.');
    }

    // Warn if using fallback
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_URL) {
        console.warn('[Supabase Config] Using SUPABASE_URL fallback. Set NEXT_PUBLIC_SUPABASE_URL for client-side access.');
    }

    return url;
}

/**
 * Resolves Supabase anon key with fallback logic
 * Tries NEXT_PUBLIC_SUPABASE_ANON_KEY first (works in both browser and server)
 * Falls back to SUPABASE_ANON_KEY for server-side only scenarios
 */
function resolveAnonKey() {
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!key) {
        console.error('[Supabase Config] Missing Supabase anon key in environment variables');
        console.error('[Supabase Config] Expected: NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY');
        throw new Error('Supabase anon key not configured. Check environment variables.');
    }

    // Warn if using fallback
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY) {
        console.warn('[Supabase Config] Using SUPABASE_ANON_KEY fallback. Set NEXT_PUBLIC_SUPABASE_ANON_KEY for client-side access.');
    }

    return key;
}

// ============================================================================
// Browser (anon) Client — Singleton
// ============================================================================

let browserClient = null;

export function getBrowserSupabase() {
    const url = resolveSupabaseUrl();
    const anon = resolveAnonKey();

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

        if (typeof window !== 'undefined') {
            console.log('[Supabase Client] Browser client initialized');
        }
    }
    return browserClient;
}

// ============================================================================
// IMPORTANT: Server admin client moved to /lib/supabaseAdmin.ts
// DO NOT import admin client from this file - it's browser-safe only
// For server-side admin operations, use: import supabaseAdmin from '@/lib/supabaseAdmin'
// ============================================================================

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
