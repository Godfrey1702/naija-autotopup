/**
 * Session-only storage adapter for Supabase Auth
 * Uses sessionStorage instead of localStorage to ensure:
 * - Sessions don't persist after browser/tab is closed
 * - Users must log in every time they return to the app
 */

export const sessionOnlyStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(key);
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(key, value);
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(key);
  },
};

/**
 * Clear all Supabase auth data from both localStorage and sessionStorage
 * Called on app initialization to ensure clean slate
 */
export const clearAllAuthData = (): void => {
  if (typeof window === 'undefined') return;
  
  // Clear localStorage auth data (from previous sessions)
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
