/**
 * Centralized API Error Handler
 * Provides consistent error handling across all API routes
 */

/**
 * Wraps an API handler with try-catch and logging
 * @param {Function} handler - The API route handler function
 * @returns {Function} - Wrapped handler with error handling
 */
export function withErrorHandler(handler) {
  return async (req, res) => {
    const startTime = Date.now();
    const requestId = `${req.method}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    try {
      // Add request ID to response headers for debugging
      res.setHeader('X-Request-ID', requestId);
      
      // Execute the actual handler
      return await handler(req, res);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log comprehensive error details
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('🔥 API ERROR');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('Request ID:', requestId);
      console.error('Timestamp:', new Date().toISOString());
      console.error('Route:', req.url);
      console.error('Method:', req.method);
      console.error('Duration:', `${duration}ms`);
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      if (req.body && Object.keys(req.body).length > 0) {
        console.error('Body:', JSON.stringify(req.body, null, 2));
      }
      if (req.query && Object.keys(req.query).length > 0) {
        console.error('Query:', JSON.stringify(req.query, null, 2));
      }
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Check if response was already sent
      if (res.headersSent) {
        console.error('⚠️ Headers already sent, cannot send error response');
        return;
      }
      
      // Determine appropriate status code
      const statusCode = error.statusCode || error.status || 500;
      
      // Send user-friendly error response
      return res.status(statusCode).json({
        error: 'An error occurred processing your request',
        message: error.message || 'Internal server error',
        requestId,
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && {
          stack: error.stack,
          details: error
        })
      });
    }
  };
}

/**
 * Creates a safe error response object
 * @param {Error} error - The error object
 * @param {string} fallbackMessage - Fallback message if error message is missing
 * @returns {Object} - Safe error response object
 */
export function createErrorResponse(error, fallbackMessage = 'An error occurred') {
  return {
    ok: false,
    error: error.message || fallbackMessage,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack
    })
  };
}

/**
 * Validates required fields in request body or query
 * @param {Object} data - The data object to validate
 * @param {Array<string>} requiredFields - Array of required field names
 * @throws {Error} - If validation fails
 */
export function validateRequiredFields(data, requiredFields) {
  const missing = requiredFields.filter(field => !data[field]);
  
  if (missing.length > 0) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.statusCode = 400;
    error.missingFields = missing;
    throw error;
  }
}

/**
 * Safely executes a database query with error handling
 * @param {Function} queryFn - Function that returns a Promise from Supabase
 * @param {string} operation - Description of the operation for logging
 * @returns {Object} - Query result with error handling
 */
export async function safeQuery(queryFn, operation = 'database query') {
  try {
    const result = await queryFn();
    
    if (result.error) {
      console.error(`Database error in ${operation}:`, result.error);
      throw new Error(`Database error: ${result.error.message}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Failed to execute ${operation}:`, error);
    throw error;
  }
}
