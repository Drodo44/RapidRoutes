// utils/apiAuthUtils.js
/**
 * Enterprise-grade server-side authentication utilities for RapidRoutes API
 * Handles token extraction, validation, and error reporting
 */

import jwt from 'jsonwebtoken';

/**
 * Extract and validate authentication token from a request
 * @param {Object} req - Express request object
 * @returns {Object} Token extraction results
 */
export function extractAuthToken(req) {
  const result = {
    token: null,
    source: null,
    tokenStart: null,
    error: null,
    cookies: Object.keys(req?.cookies || {}).length,
    hasAuthHeader: !!req?.headers?.authorization,
    authHeaderFormat: null
  };

  try {
    // 1. Extract from Authorization header (preferred method)
    const authHeader = req?.headers?.authorization || '';
    if (authHeader) {
      // Check for Bearer token format
      if (authHeader.startsWith('Bearer ')) {
        result.authHeaderFormat = 'Bearer';
        result.token = authHeader.slice(7).trim();
        result.source = 'header';
        result.tokenStart = result.token.substring(0, 10);
        
        // Validate that the token looks like a JWT (contains two dots)
        if (result.token && result.token.split('.').length === 3) {
          console.log(`✅ Valid Bearer token found in Authorization header`);
          return result;
        } else {
          console.warn(`⚠️ Invalid JWT format in Authorization header`);
        }
      } else {
        result.authHeaderFormat = 'Invalid';
        // Try to extract token without 'Bearer ' prefix (older clients might send just the token)
        const possibleToken = authHeader.trim();
        if (possibleToken && possibleToken.split('.').length === 3) {
          result.token = possibleToken;
          result.source = 'header:raw';
          result.tokenStart = result.token.substring(0, 10);
          console.log(`✅ Raw token found in Authorization header`);
          return result;
        }
      }
    }
    
    // 2. Extract from cookies (fallback)
    const cookies = req?.cookies || {};
    
    // 2.1. Try standard cookie names
    const standardCookieNames = ['sb-access-token', 'sb:token', 'supabase-auth-token'];
    for (const name of standardCookieNames) {
      if (cookies[name] && typeof cookies[name] === 'string') {
        try {
          // If it looks like a JWT (contains two dots), use it directly
          if (cookies[name].split('.').length === 3) {
            result.token = cookies[name];
            result.source = `cookie:${name}`;
            result.tokenStart = result.token.substring(0, 10);
            return result;
          }
          
          // Try parsing as JSON
          const parsed = JSON.parse(cookies[name]);
          if (parsed?.access_token) {
            result.token = parsed.access_token;
            result.source = `cookie:${name}:json`;
            result.tokenStart = result.token.substring(0, 10);
            return result;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }
    
    // 2.2. Try to find any sb- prefixed cookies (Supabase format)
    const supabaseCookies = Object.keys(cookies).filter(key => key.startsWith('sb-'));
    for (const name of supabaseCookies) {
      try {
        const parsed = JSON.parse(cookies[name]);
        if (parsed?.access_token) {
          result.token = parsed.access_token;
          result.source = `cookie:${name}:parsed`;
          result.tokenStart = result.token.substring(0, 10);
          return result;
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    // 3. No valid token found
    result.error = 'No valid authentication token found';
    return result;
  } catch (error) {
    result.error = `Token extraction error: ${error.message}`;
    return result;
  }
}

/**
 * Decode a JWT token without verification
 * @param {string} token - JWT token
 * @returns {Object} Decoded token or null
 */
export function decodeToken(token) {
  if (!token) return null;
  
  try {
    // Basic structure validation
    if (token.split('.').length !== 3) {
      return null;
    }
    
    // Decode the token payload using browser-compatible base64 decoding
    const payload = token.split('.')[1];
    // Convert base64url to base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // Decode the payload
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    
    return {
      sub: decoded.sub,
      email: decoded.email,
      exp: decoded.exp,
      iat: decoded.iat,
      iss: decoded.iss,
      raw: decoded
    };
  } catch (error) {
    return null;
  }
}

/**
 * Get detailed information about a token
 * @param {string} token - The token to analyze
 * @returns {Object} Token information
 */
export function getTokenInfo(token) {
  if (!token) return { valid: false, reason: 'No token provided' };
  
  try {
    const decoded = decodeToken(token);
    if (!decoded) return { valid: false, reason: 'Invalid token format' };
    
    const now = Math.floor(Date.now() / 1000);
    const isExpired = decoded.exp < now;
    
    return {
      valid: !isExpired,
      userId: decoded.sub,
      email: decoded.email,
      issuer: decoded.iss,
      expiresAt: new Date(decoded.exp * 1000).toISOString(),
      issuedAt: new Date(decoded.iat * 1000).toISOString(),
      expiresIn: decoded.exp - now,
      reason: isExpired ? 'Token expired' : null,
    };
  } catch (error) {
    return {
      valid: false,
      reason: `Token analysis error: ${error.message}`,
    };
  }
}