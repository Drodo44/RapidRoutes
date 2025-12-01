// lib/laneFilterPreferences.js
// Manage user preferences for lane filtering (Admin toggle state)

const STORAGE_KEY = 'rapidroutes_show_my_lanes_only';

/**
 * Get the current "My Lanes Only" toggle state for Admin users
 * Returns null if not set, true if enabled, false if disabled
 */
export function getMyLanesOnlyPreference() {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return null;
    return stored === 'true';
  } catch (err) {
    console.warn('[laneFilterPreferences] Could not read localStorage:', err);
    return null;
  }
}

/**
 * Set the "My Lanes Only" toggle state for Admin users
 */
export function setMyLanesOnlyPreference(enabled) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch (err) {
    console.warn('[laneFilterPreferences] Could not write localStorage:', err);
  }
}

/**
 * Clear the toggle preference
 */
export function clearMyLanesOnlyPreference() {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[laneFilterPreferences] Could not clear localStorage:', err);
  }
}
