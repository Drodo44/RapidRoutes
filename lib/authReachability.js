function collectErrorParts(error) {
  if (!error) return [];
  if (typeof error === 'string') return [error];

  const parts = [];
  if (error.name) parts.push(String(error.name));
  if (error.message) parts.push(String(error.message));
  if (error.code) parts.push(String(error.code));
  if (error.status) parts.push(String(error.status));
  if (error.statusCode) parts.push(String(error.statusCode));

  if (error.error?.message) parts.push(String(error.error.message));
  if (error.cause?.message) parts.push(String(error.cause.message));
  if (error.details) parts.push(String(error.details));

  return parts;
}

export function authErrorText(error) {
  return collectErrorParts(error).join(' | ').toLowerCase();
}

export function isAuthUnreachable(error) {
  const text = authErrorText(error);
  if (!text) return false;

  return (
    text.includes('failed to fetch') ||
    text.includes('authretryablefetcherror') ||
    text.includes('session_timeout') ||
    text.includes('522') ||
    text.includes('connection timed out') ||
    text.includes('err_failed') ||
    text.includes('no access-control-allow-origin') ||
    text.includes('cors')
  );
}

export function authUnavailableReason(error) {
  const text = authErrorText(error);

  if (text.includes('session_timeout')) return 'SESSION_TIMEOUT';
  if (text.includes('authretryablefetcherror')) return 'AUTH_RETRYABLE_FETCH_ERROR';
  if (text.includes('522') || text.includes('connection timed out')) return 'SUPABASE_522';
  if (text.includes('no access-control-allow-origin') || text.includes('cors')) return 'AUTH_CORS_BLOCKED';
  if (text.includes('failed to fetch') || text.includes('err_failed')) return 'AUTH_NETWORK_FAILED';

  const fallback = error?.message || error?.name || 'AUTH_UNREACHABLE';
  return String(fallback);
}
