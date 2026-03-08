/**
 * @fileoverview Users Service Layer
 * 
 * Abstracts user profile and KYC operations.
 * Maps to future backend module: verify-nin → users module
 * 
 * @module api/users
 */

import { supabase } from "@/integrations/supabase/client";
// import { api } from "./client"; // Uncomment for future external backend

/**
 * Fetch user profile.
 * 
 * Current: Supabase direct query
 * Future: GET /users/profile
 */
export async function getProfile(userId: string) {
  // --- Current: Supabase ---
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  return { data, error };

  // --- Future: External Backend ---
  // const { data } = await api.get("/users/profile");
  // return { data: data.profile, error: null };
}

/**
 * Update user profile.
 * 
 * Current: Supabase direct query
 * Future: PATCH /users/profile
 */
export async function updateProfile(userId: string, updates: Record<string, unknown>) {
  // --- Current: Supabase ---
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("user_id", userId);
  return { error };

  // --- Future: External Backend ---
  // await api.patch("/users/profile", updates);
  // return { error: null };
}

/**
 * Submit NIN for KYC verification.
 * 
 * Current: Supabase Edge Function (verify-nin)
 * Future: POST /users/kyc/verify
 */
export async function submitKYCVerification(ninNumber: string) {
  // --- Current: Supabase ---
  const { data, error } = await supabase.functions.invoke("verify-nin", {
    body: { nin: ninNumber },
  });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || "NIN verification failed");
  return data;

  // --- Future: External Backend ---
  // const { data } = await api.post("/users/kyc/verify", { nin: ninNumber });
  // return data;
}

/**
 * Fetch user phone numbers.
 * 
 * Current: Supabase direct query
 * Future: GET /users/phone-numbers
 */
export async function getPhoneNumbers(userId: string) {
  // --- Current: Supabase ---
  const { data, error } = await supabase
    .from("phone_numbers")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  return { data, error };

  // --- Future: External Backend ---
  // const { data } = await api.get("/users/phone-numbers");
  // return { data: data.phoneNumbers, error: null };
}
