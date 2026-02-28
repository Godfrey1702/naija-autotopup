/**
 * @fileoverview Authentication Context Provider
 * 
 * This module provides authentication state management and user profile handling
 * for the entire application. It wraps the Supabase Auth API and provides a
 * consistent interface for authentication operations.
 * 
 * ## Features
 * - User authentication (sign up, sign in, sign out)
 * - Profile management with automatic fetching
 * - KYC verification through secure backend
 * - Session state tracking
 * 
 * ## Security Notes
 * - NIN (National Identity Number) is NOT stored in the profiles table
 * - NIN is stored in a separate `user_kyc` table with restricted RLS policies
 * - Users can only INSERT their NIN (no SELECT/UPDATE/DELETE)
 * - NIN is encoded and hashed for additional protection
 * - Only backend services with service_role can read NIN data
 * 
 * @example
 * // Using the auth hook in a component
 * import { useAuth } from "@/contexts/AuthContext";
 * 
 * function MyComponent() {
 *   const { user, profile, signIn, signOut, isKYCVerified } = useAuth();
 *   
 *   if (!user) return <LoginPrompt />;
 *   return <Dashboard userName={profile?.full_name} />;
 * }
 * 
 * @module AuthContext
 */

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { clearAllAuthData } from "@/lib/sessionOnlyStorage";
import apiClient from "@/lib/apiClient";

/**
 * User profile data structure.
 * Retrieved from the `profiles` table in Supabase.
 * 
 * @interface Profile
 */
export interface Profile {
  /** Unique profile record ID */
  id: string;
  /** Reference to auth.users.id */
  user_id: string;
  /** User's primary phone number (Nigerian format) */
  phone_number: string | null;
  /** Whether the phone number has been verified via OTP */
  phone_verified: boolean;
  /** Detected network provider (MTN, Airtel, Glo, 9mobile) */
  network_provider: string | null;
  /** User's display name */
  full_name: string | null;
  /** KYC verification status */
  kyc_status: "pending" | "verified" | "rejected";
  /** Timestamp when KYC was verified */
  kyc_verified_at: string | null;
}

/**
 * Authentication context type definition.
 * Provides all authentication-related state and methods.
 * 
 * @interface AuthContextType
 */
interface AuthContextType {
  /** Currently authenticated user or null */
  user: User | null;
  /** Active session or null */
  session: Session | null;
  /** User's profile data or null */
  profile: Profile | null;
  /** Whether auth state is being loaded */
  loading: boolean;
  /** Register a new user account */
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  /** Sign in with email and password */
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  /** Sign out and clear all auth data */
  signOut: () => Promise<void>;
  /** Update the user's profile */
  updateProfile: (data: Partial<Profile>) => Promise<{ error: Error | null }>;
  /** Submit NIN for KYC verification */
  submitKYC: (ninNumber: string) => Promise<{ error: Error | null }>;
  /** Convenience flag for KYC verified status */
  isKYCVerified: boolean;
}

/** React context for authentication state */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Custom hook to access authentication context.
 * Must be used within an AuthProvider.
 * 
 * @throws {Error} If used outside of AuthProvider
 * @returns {AuthContextType} Authentication state and methods
 * 
 * @example
 * const { user, profile, signOut } = useAuth();
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

/**
 * Authentication Provider Component.
 * Wraps the application to provide authentication state to all children.
 * 
 * This provider:
 * 1. Initializes auth state on mount
 * 2. Listens for auth state changes
 * 3. Automatically fetches user profile on login
 * 4. Clears all auth data on logout
 * 
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components to wrap
 * 
 * @example
 * // In App.tsx or main.tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Fetches the user's profile from the database.
   * Called automatically when a user signs in.
   * 
   * @param {string} userId - The user's auth ID
   * @returns {Promise<Profile | null>} The user's profile or null if not found
   */
  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data as Profile;
  };

  // Set up auth state listener on mount
  useEffect(() => {
    // Subscribe to auth state changes FIRST to avoid race conditions
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer profile fetch to avoid potential deadlocks
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id).then(setProfile);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // If there's a backend access token stored, try to hydrate user from backend
  useEffect(() => {
    (async () => {
      try {
        const token = apiClient.getStoredAccessToken();
        if (!token) return;

        const userData = await apiClient.apiRequest('GET', '/users/me');
        if (userData) {
          setUser(userData as unknown as User);
          // Try fetching profile from supabase profiles table if available
          if ((userData as any).id) {
            fetchProfile((userData as any).id).then(setProfile);
          }
        }
      } catch (err) {
        // Token invalid or failed to hydrate, clear saved token
        apiClient.clearAccessToken();
      }
    })();
  }, []);

  /**
   * Registers a new user account.
   * Creates the user in Supabase Auth and triggers profile creation via database trigger.
   * 
   * @param {string} email - User's email address
   * @param {string} password - User's password (min 6 characters)
   * @param {string} fullName - User's display name
   * @returns {Promise<{ error: Error | null }>} Result object with error if failed
   */
  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const names = fullName.trim().split(/\s+/);
      const firstName = names.shift() || '';
      const lastName = names.join(' ') || firstName;

      const data = await apiClient.apiRequest('POST', '/auth/register', {
        email,
        password,
        firstName,
        lastName,
      }, { includeAuth: false });

      const token = (data as any).accessToken;
      if (token) apiClient.setAccessToken(token);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  /**
   * Signs in an existing user with email and password.
   * 
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @returns {Promise<{ error: Error | null }>} Result object with error if failed
   */
  const signIn = async (email: string, password: string) => {
    try {
      const data = await apiClient.apiRequest('POST', '/auth/login', { email, password }, { includeAuth: false });
      const token = (data as any).accessToken || (data as any).tokens?.accessToken;
      const userObj = (data as any).user || null;
      if (token) {
        apiClient.setAccessToken(token);
        setSession({ access_token: token } as unknown as Session);
      }
      if (userObj) setUser(userObj as unknown as User);

      // try to hydrate profile
      if (userObj?.id) {
        try {
          const profileFromDb = await fetchProfile(userObj.id);
          if (profileFromDb) setProfile(profileFromDb);
        } catch (_) {}
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  /**
   * Signs out the current user and clears all auth data.
   * This ensures no session data persists after logout or app closure.
   */
  const signOut = async () => {
    try {
      // Attempt backend logout (clears refresh cookie)
      await apiClient.apiRequest('POST', '/auth/logout', null);
    } catch (_) {}

    // Clear stored access token and any auth artifacts
    apiClient.clearAccessToken();
    clearAllAuthData();
    setProfile(null);
    setUser(null);
    setSession(null);
  };

  /**
   * Updates the user's profile data.
   * Only updates specified fields, preserving other data.
   * 
   * @param {Partial<Profile>} data - Fields to update
   * @returns {Promise<{ error: Error | null }>} Result object with error if failed
   */
  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) return { error: new Error("No user logged in") };

    const { error } = await supabase
      .from("profiles")
      .update(data)
      .eq("user_id", user.id);

    if (!error && profile) {
      setProfile({ ...profile, ...data });
    }

    return { error };
  };

  /**
   * Submits NIN for KYC verification via secure backend.
   * 
   * The verification is handled by the `verify-nin` edge function which:
   * 1. Validates NIN format
   * 2. Verifies with NIMC API (mock for now)
   * 3. Stores NIN in user_kyc table with service_role (bypasses RLS)
   * 4. Updates profiles with verification status
   * 
   * @param {string} ninNumber - 11-digit Nigerian NIN
   * @returns {Promise<{ error: Error | null }>} Result object with error if failed
   */
  const submitKYC = async (ninNumber: string) => {
    if (!user) return { error: new Error("No user logged in") };

    try {
      // Call secure backend edge function for NIN verification
      const { data, error } = await supabase.functions.invoke('verify-nin', {
        body: { nin: ninNumber },
      });

      if (error) {
        return { error: new Error(error.message || 'Verification failed') };
      }

      if (!data.success) {
        return { error: new Error(data.error || 'NIN verification failed') };
      }

      // Update local profile state with verification result
      if (profile) {
        setProfile({
          ...profile,
          kyc_status: data.status,
          kyc_verified_at: data.verifiedAt,
        });
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  /** Convenience flag for checking KYC status */
  const isKYCVerified = profile?.kyc_status === "verified";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        updateProfile,
        submitKYC,
        isKYCVerified,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
