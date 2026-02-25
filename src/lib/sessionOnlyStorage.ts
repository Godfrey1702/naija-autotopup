/**
 * @fileoverview Session-Only Storage Adapter
 * 
 * This module provides a custom storage adapter for Supabase Auth that ensures
 * user sessions do not persist after the browser or app is closed. It also
 * includes a utility to clear all auth-related data on app initialization.
 * 
 * ## Purpose
 * The app requires users to log in every time they return. This is achieved by:
 * 1. Using sessionStorage instead of localStorage for auth tokens
 * 2. Clearing all auth data on app initialization
 * 
 * ## How It Works
 * - `sessionOnlyStorage`: A storage adapter that uses sessionStorage
 * - `clearAllAuthData`: Clears all Supabase keys from both storage types
 * 
 * ## Usage
 * The `clearAllAuthData` function is called in `main.tsx` before the app renders.
 * This ensures a clean slate on every app load, forcing a new login.
 * 
 * @example
 * // In main.tsx
 * import { clearAllAuthData } from "./lib/sessionOnlyStorage";
 * 
 * // Clear auth before app loads
 * clearAllAuthData();
 * 
 * createRoot(document.getElementById("root")!).render(<App />);
 * 
 * @module sessionOnlyStorage
 */

/**
 * Custom storage adapter for Supabase Auth using sessionStorage.
 * 
 * This adapter implements the same interface as localStorage but uses
 * sessionStorage, which is cleared when the browser tab is closed.
 * 
 * Note: This is exported for potential future use but the current
 * implementation uses clearAllAuthData on load instead.
 * 
 * @constant
 */
export const sessionOnlyStorage = {
  /**
   * Retrieves an item from sessionStorage.
   * @param {string} key - Storage key
   * @returns {string | null} Stored value or null
   */
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(key);
  },
  
  /**
   * Stores an item in sessionStorage.
   * @param {string} key - Storage key
   * @param {string} value - Value to store
   */
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(key, value);
  },
  
  /**
   * Removes an item from sessionStorage.
   * @param {string} key - Storage key to remove
   */
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(key);
  },
};

/**
 * Clears all Supabase auth data from both localStorage and sessionStorage.
 * 
 * This function is called on app initialization to ensure that no previous
 * session data persists. It removes any keys that:
 * - Start with "sb-" (Supabase standard prefix)
 * - Contain "supabase" in the key name
 * 
 * ## When to Call
 * - On app initialization (in main.tsx)
 * - On explicit logout (in AuthContext signOut)
 * 
 * @example
 * // Clear all auth data on app load
 * clearAllAuthData();
 */
export const clearAllAuthData = (): void => {
  if (typeof window === 'undefined') return;
  
  // Clear localStorage auth data (from any previous sessions)
  const localStorageKeys = Object.keys(localStorage);
  localStorageKeys.forEach(key => {
    if (key.startsWith('sb-') || key.includes('supabase')) {
      localStorage.removeItem(key);
    }
  });
  
  // Clear sessionStorage auth data
  const sessionStorageKeys = Object.keys(sessionStorage);
  sessionStorageKeys.forEach(key => {
    if (key.startsWith('sb-') || key.includes('supabase')) {
      sessionStorage.removeItem(key);
    }
  });
};
