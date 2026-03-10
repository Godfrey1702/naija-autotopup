/**
 * @fileoverview Authentication Service Layer
 * 
 * Abstracts all authentication operations. Currently delegates to Supabase Auth.
 * When the external backend is ready, swap implementations here without
 * touching any UI components.
 * 
 * @module api/auth
 */

import { supabase } from "@/integrations/supabase/client";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
// import { api } from "./client"; // Uncomment for future external backend

/**
 * Sign up a new user.
 */
export async function registerUser(email: string, password: string, fullName: string) {
  const redirectUrl = `${window.location.origin}/`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: { full_name: fullName },
    },
  });
  return { data, error };
}

/**
 * Sign in an existing user.
 */
export async function loginUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

/**
 * Sign out the current user.
 */
export async function logoutUser() {
  await supabase.auth.signOut();
}

/**
 * Request a password reset email.
 */
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return { error };
}

/**
 * Get the current session.
 */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Update the current user's password.
 */
export async function updateUserPassword(password: string) {
  const { data, error } = await supabase.auth.updateUser({ password });
  return { data, error };
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}

export type { User, Session };
