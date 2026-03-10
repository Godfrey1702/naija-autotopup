/**
 * @fileoverview Authentication Context Provider
 * 
 * Provides authentication state management and user profile handling.
 * All backend communication goes through the src/api service layer.
 * 
 * @module AuthContext
 */

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { clearAllAuthData } from "@/lib/sessionOnlyStorage";
import { authService, userService } from "@/api";
import type { User, Session } from "@/api/auth";

/**
 * User profile data structure.
 */
export interface Profile {
  id: string;
  user_id: string;
  phone_number: string | null;
  phone_verified: boolean;
  network_provider: string | null;
  full_name: string | null;
  kyc_status: "pending" | "verified" | "rejected";
  kyc_verified_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: Error | null }>;
  submitKYC: (ninNumber: string) => Promise<{ error: Error | null }>;
  isKYCVerified: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

const normalizeAuthError = (error: unknown): Error => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("failed to fetch") || message.includes("networkerror") || message.includes("load failed")) {
      return new Error("Unable to reach authentication service. Please check your connection and try again.");
    }
    return error;
  }
  return new Error("Authentication failed. Please try again.");
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await userService.getProfile(userId);
    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data as Profile;
  };

  useEffect(() => {
    // Subscribe to auth state changes via service layer
    const unsubscribe = authService.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id).then(setProfile);
        }, 0);
      } else {
        setProfile(null);
      }
    });

    // Check for existing session via service layer
    authService.getSession().then((session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await authService.registerUser(email, password, fullName);
      return { error };
    } catch (error) {
      return { error: normalizeAuthError(error) };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await authService.loginUser(email, password);
      return { error };
    } catch (error) {
      return { error: normalizeAuthError(error) };
    }
  };

  const signOut = async () => {
    await authService.logoutUser();
    clearAllAuthData();
    setProfile(null);
    setUser(null);
    setSession(null);
  };

  const updateProfileHandler = async (data: Partial<Profile>) => {
    if (!user) return { error: new Error("No user logged in") };
    const { error } = await userService.updateProfile(user.id, data as Record<string, unknown>);
    if (!error && profile) {
      setProfile({ ...profile, ...data });
    }
    return { error };
  };

  const submitKYC = async (ninNumber: string) => {
    if (!user) return { error: new Error("No user logged in") };
    try {
      const data = await userService.submitKYCVerification(ninNumber);
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
        updateProfile: updateProfileHandler,
        submitKYC,
        isKYCVerified,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
