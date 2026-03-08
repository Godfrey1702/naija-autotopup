/**
 * @fileoverview Wallets Service Layer
 * 
 * Abstracts wallet operations. Currently delegates to Supabase.
 * 
 * @module api/wallets
 */

import { supabase } from "@/integrations/supabase/client";
// import { api } from "./client"; // Uncomment for future external backend

/**
 * Fetch the user's wallet.
 * 
 * Current: Supabase direct query
 * Future: GET /wallets
 */
export async function getWallet(userId: string) {
  // --- Current: Supabase ---
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return { data, error };

  // --- Future: External Backend ---
  // const { data } = await api.get("/wallets");
  // return { data: data.wallet, error: null };
}

/**
 * Fund wallet via secure edge function.
 * 
 * Current: Supabase Edge Function
 * Future: POST /wallets/fund
 */
export async function fundWallet(amount: number, reference?: string) {
  // --- Current: Supabase ---
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Session expired");

  const { data, error } = await supabase.functions.invoke(
    "secure-transaction-update/fund-wallet",
    {
      body: { amount, reference },
      headers: { Authorization: `Bearer ${session.access_token}` },
    }
  );
  if (error) throw error;
  return data;

  // --- Future: External Backend ---
  // const { data } = await api.post("/wallets/fund", { amount, reference });
  // return data;
}

/**
 * Fetch auto top-up rules.
 * 
 * Current: Supabase direct query
 * Future: GET /wallets/auto-topup-rules
 */
export async function getAutoTopUpRules(userId: string) {
  // --- Current: Supabase ---
  const { data, error } = await supabase
    .from("auto_topup_rules")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  return { data, error };

  // --- Future: External Backend ---
  // const { data } = await api.get("/wallets/auto-topup-rules");
  // return { data: data.rules, error: null };
}
