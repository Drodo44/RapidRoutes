/**
 * Server-Side Error Logger
 * Logs errors to Supabase error_logs table and console
 */

import supabaseAdmin from './supabaseAdmin';

/**
 * Log an error to the database and console
 * @param {Error|string} error - The error to log
 * @param {Object} context - Additional context about the error
 */
export async function logError(error, context = {}) {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : null;
  
  // Console logging with visual separation
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('🔥 ERROR LOGGED');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('Timestamp:', timestamp);
  console.error('Message:', errorMessage);
  if (context.route) console.error('Route:', context.route);
  if (context.method) console.error('Method:', context.method);
  if (context.userId) console.error('User ID:', context.userId);
  if (errorStack) console.error('Stack:', errorStack);
  if (Object.keys(context).length > 0) {
    console.error('Context:', JSON.stringify(context, null, 2));
  }
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Try to log to database (non-blocking)
  try {
    await supabaseAdmin
      .from('error_logs')
      .insert([{
        timestamp,
        message: errorMessage,
        stack: errorStack,
        context,
        severity: context.severity || 'error',
        resolved: false
      }]);
  } catch (dbError) {
    console.error('Failed to log error to database:', dbError.message);
  }
}

/**
 * Log a warning (non-critical error)
 */
export async function logWarning(message, context = {}) {
  return logError(message, { ...context, severity: 'warning' });
}

/**
 * Log critical system error
 */
export async function logCritical(error, context = {}) {
  return logError(error, { ...context, severity: 'critical' });
}

export default { logError, logWarning, logCritical };
