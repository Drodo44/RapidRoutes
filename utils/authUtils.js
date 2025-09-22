// utils/authUtils.js
/**
 * Enterprise-grade authentication utilities for RapidRoutes
 * Handles token management, session refresh, and authentication state
 */

import { supabase } from './supabaseClient';

/**
 * Get the current authentication token with session refresh if needed
 * @returns {Promise<{token: string|null, user: Object|null, error: Error|null}>}
 */
export async function getCurrentToken() {
  try {
    // First try to get the current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    // Debug logging for session state
    const session = sessionData?.session;
    const tokenExpiry = session?.expires_at 
      ? new Date(session.expires_at * 1000).toISOString()
      : 'no expiry';
    
    console.debug('Auth: Current session state', { 
      hasSession: !!session,
      expiry: tokenExpiry,
      expiresIn: session ? Math.floor((session.expires_at * 1000 - Date.now()) / 1000) : 'N/A',
      userId: session?.user?.id || 'none'
    });
    
    // Handle session error
    if (sessionError) {
      console.error('Auth: Session retrieval error', sessionError);
      return { token: null, user: null, error: sessionError };
    }
    
    // If session exists but is expired or expiring within 5 minutes, refresh it
    if (session) {
      const expiresAt = session.expires_at * 1000; // convert to milliseconds
      const isExpired = expiresAt < Date.now();
      const expiringWithinMinutes = (expiresAt - Date.now()) < (5 * 60 * 1000); // 5 minutes
      
      if (isExpired || expiringWithinMinutes) {
        console.debug(`Auth: Token ${isExpired ? 'expired' : 'expiring soon'}, refreshing...`);
        
        // Use the refresh token to get a new session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('Auth: Token refresh error', refreshError);
          // Return the original session data if refresh fails but session is not expired
          return !isExpired 
            ? { token: session.access_token, user: session.user, error: null } 
            : { token: null, user: null, error: refreshError };
        }
        
        const newSession = refreshData?.session;
        if (newSession) {
          console.debug('Auth: Token refreshed successfully', {
            newExpiry: new Date(newSession.expires_at * 1000).toISOString(),
            userId: newSession?.user?.id
          });
          return { token: newSession.access_token, user: newSession.user, error: null };
        }
        
        // If we couldn't get a new session but have a valid one, use it
        return !isExpired 
          ? { token: session.access_token, user: session.user, error: null } 
          : { token: null, user: null, error: new Error('Failed to refresh token') };
      }
      
      // Session exists and is not expiring soon, return the current token
      return { token: session.access_token, user: session.user, error: null };
    }
    
    // No session found, attempt to get the user directly
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData?.user) {
      console.debug('Auth: No active session or user found');
      return { token: null, user: null, error: userError || new Error('No active session') };
    }
    
    // If we have a user but no session, attempt to create a new session
    console.debug('Auth: User found but no session, attempting recovery');
    
    // This would typically be handled by the application's sign-in flow
    return { token: null, user: userData.user, error: new Error('Session missing but user exists') };
  } catch (error) {
    console.error('Auth: Unexpected error in getCurrentToken', error);
    return { token: null, user: null, error };
  }
}

/**
 * Create an authenticated fetch function for API calls
 * @returns {Function} Fetch function with authentication headers
 */
export function createAuthenticatedFetch() {
  /**
   * Authenticated fetch function
   * @param {string} url - The URL to fetch
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>} - The fetch response
   */
  return async (url, options = {}) => {
    try {
      // Get the current token
      const { token, error } = await getCurrentToken();
      
      if (error) {
        console.error('Auth: Failed to get token for authenticated request', error);
      }
      
      // Prepare headers with authentication
      const headers = {
        ...(options.headers || {}),
        'Content-Type': 'application/json',
      };
      
      // Only add the Authorization header if we have a token
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Ensure cookies flow with the request
      const fetchOptions = {
        ...options,
        credentials: 'include',
        headers,
      };
      
      return fetch(url, fetchOptions);
    } catch (error) {
      console.error('Auth: Error in authenticatedFetch', error);
      throw error;
    }
  };
}

// Export an authenticated fetch instance for direct use
export const authenticatedFetch = createAuthenticatedFetch();

/**
 * Decode a JWT token (for debugging purposes only)
 * @param {string} token - The JWT token to decode
 * @returns {Object|null} The decoded token payload or null if invalid
 */
export function decodeToken(token) {
  if (!token) return null;
  
  try {
    // Split the token and get the middle part (payload)
    const base64Payload = token.split('.')[1];
    
    // Use browser-compatible base64 decoding
    // Convert base64url to base64
    const base64 = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
    // Decode the payload
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode token', error);
    return null;
  }
}

/**
 * Get token details for debugging purposes
 * @param {string} token - The token to analyze
 * @returns {Object} Token information
 */
export function getTokenInfo(token) {
  if (!token) return { valid: false, reason: 'No token provided' };
  
  try {
    const decoded = decodeToken(token);
    if (!decoded) return { valid: false, reason: 'Failed to decode token' };
    
    const now = Math.floor(Date.now() / 1000);
    const isExpired = decoded.exp < now;
    const timeLeft = decoded.exp - now;
    
    return {
      valid: !isExpired,
      userId: decoded.sub,
      email: decoded.email,
      issuer: decoded.iss,
      issuedAt: new Date(decoded.iat * 1000).toISOString(),
      expiresAt: new Date(decoded.exp * 1000).toISOString(),
      timeLeft: `${Math.floor(timeLeft / 60)} min, ${timeLeft % 60} sec`,
      reason: isExpired ? 'Token expired' : null,
    };
  } catch (error) {
    return {
      valid: false,
      reason: `Token analysis error: ${error.message}`,
    };
  }
}