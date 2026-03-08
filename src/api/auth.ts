/**
 * @fileoverview Authentication Service Layer
 * 
 * Abstracts authentication operations. Currently delegates to Supabase Auth.
 * When the external backend is ready, swap implementations here without
 * touching any UI components.
 * 
 * @module api/auth
 */

import { supabase } from "@/integrations/supabase/client";
// import { api } from "./client"; // Uncomment for future external backend

/**
 * Sign up a new user.
 * 
 * Current: Supabase Auth
 * Future: POST /auth/register
 */
export async function registerUser(email: string, password: string, fullName: string) {
  // --- Current: Supabase ---
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

  // --- Future: External Backend ---
  // const { data } = await api.post("/auth/register", { email, password, fullName });
  // return { data: data, error: null };
}

/**
 * Sign in an existing user.
 * 
 * Current: Supabase Auth
 * Future: POST /auth/login
 */
export async function loginUser(email: string, password: string) {
  // --- Current: Supabase ---
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };

  // --- Future: External Backend ---
  // const { data } = await api.post("/auth/login", { email, password });
  // setAuthToken(data.token);
  // return { data, error: null };
}

/**
 * Sign out the current user.
 * 
 * Current: Supabase Auth
 * Future: Clear local token
 */
export async function logoutUser() {
  // --- Current: Supabase ---
  await supabase.auth.signOut();

  // --- Future: External Backend ---
  // setAuthToken(null);
  // localStorage.removeItem("auth_token");
}

/**
 * Request a password reset email.
 * 
 * Current: Supabase Auth
 * Future: POST /auth/forgot-password
 */
export async function resetPassword(email: string) {
  // --- Current: Supabase ---
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return { error };

  // --- Future: External Backend ---
  // await api.post("/auth/forgot-password", { email });
  // return { error: null };
}

/**
 * Get the current session.
 * 
 * Current: Supabase Auth
 * Future: Validate JWT token
 */
export async function getSession() {
  // --- Current: Supabase ---
  const { data: { session } } = await supabase.auth.getSession();
  return session;

  // --- Future: External Backend ---
  // const token = localStorage.getItem("auth_token");
  // if (!token) return null;
  // const { data } = await api.get("/auth/session");
  // return data;
}
