import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * SECURITY NOTE: NIN (National Identity Number) is NOT stored in profiles table.
 * NIN is stored in a separate `user_kyc` table with restricted RLS policies:
 * - Users can only INSERT their NIN (no SELECT/UPDATE/DELETE)
 * - NIN is encoded and hashed for additional protection
 * - Only backend services with service_role can read NIN data
 * This protects sensitive PII from potential RLS misconfigurations.
 * See: security finding "profiles_table_nin_exposure"
 */
export interface Profile {
  id: string;
  user_id: string;
  phone_number: string | null;
  phone_verified: boolean;
  network_provider: string | null;
  full_name: string | null;
  // NIN removed from profiles - stored in user_kyc table for security
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer profile fetch with setTimeout to avoid deadlock
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

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

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
   * SECURITY FIX: NIN verification is now handled by a secure backend edge function.
   * 
   * The edge function (verify-nin):
   * 1. Validates NIN format
   * 2. Verifies with NIMC API (mock for now, ready for production)
   * 3. Stores NIN in user_kyc table with service_role (bypasses RLS)
   * 4. Updates profiles with verification status
   * 
   * Benefits:
   * - NIN never stored via client-side code
   * - Server-side validation prevents tampering
   * - Service role ensures secure database access
   * - Ready for real NIMC API integration
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
