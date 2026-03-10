/**
 * @fileoverview Users Service Layer
 * 
 * Abstracts user profile, KYC, and phone number operations.
 * 
 * @module api/users
 */

import { supabase } from "@/integrations/supabase/client";
// import { api } from "./client"; // Uncomment for future external backend

/**
 * Fetch user profile.
 */
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  return { data, error };
}

/**
 * Update user profile.
 */
export async function updateProfile(userId: string, updates: Record<string, unknown>) {
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("user_id", userId);
  return { error };
}

/**
 * Submit NIN for KYC verification.
 */
export async function submitKYCVerification(ninNumber: string) {
  const { data, error } = await supabase.functions.invoke("verify-nin", {
    body: { nin: ninNumber },
  });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || "NIN verification failed");
  return data;
}

/**
 * Fetch user phone numbers.
 */
export async function getPhoneNumbers(userId: string) {
  const { data, error } = await supabase
    .from("phone_numbers")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  return { data, error };
}

/**
 * Add a phone number.
 */
export async function addPhoneNumber(params: {
  user_id: string;
  phone_number: string;
  network_provider: string | null;
  label: string | null;
  is_verified?: boolean;
}) {
  const { error } = await supabase.from("phone_numbers").insert(params);
  return { error };
}

/**
 * Update a phone number.
 */
export async function updatePhoneNumber(id: string, userId: string, updates: Record<string, unknown>) {
  const { error } = await supabase
    .from("phone_numbers")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId);
  return { error };
}

/**
 * Delete a phone number.
 */
export async function deletePhoneNumber(id: string, userId: string) {
  const { error } = await supabase
    .from("phone_numbers")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  return { error };
}
