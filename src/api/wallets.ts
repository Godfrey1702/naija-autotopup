/**
 * @fileoverview Wallets Service Layer
 * 
 * Abstracts wallet operations. Currently delegates to Supabase.
 * 
 * @module api/wallets
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
// import { api } from "./client"; // Uncomment for future external backend

/**
 * Fetch the user's wallet.
 */
export async function getWallet(userId: string) {
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return { data, error };
}

/**
 * Fund wallet via secure edge function.
 */
export async function fundWallet(amount: number, reference?: string) {
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
}

/**
 * Fetch auto top-up rules.
 */
export async function getAutoTopUpRules(userId: string) {
  const { data, error } = await supabase
    .from("auto_topup_rules")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  return { data, error };
}

/**
 * Create an auto top-up rule.
 */
export async function createAutoTopUpRule(params: {
  user_id: string;
  type: string;
  threshold_percentage: number;
  topup_amount: number;
  is_enabled: boolean;
  phone_number_id: string | null;
}) {
  const { error } = await supabase.from("auto_topup_rules").insert(params);
  return { error };
}

/**
 * Update an auto top-up rule.
 */
export async function updateAutoTopUpRule(id: string, updates: Record<string, unknown>) {
  const { error } = await supabase
    .from("auto_topup_rules")
    .update(updates)
    .eq("id", id);
  return { error };
}

/**
 * Delete an auto top-up rule.
 */
export async function deleteAutoTopUpRule(id: string) {
  const { error } = await supabase
    .from("auto_topup_rules")
    .delete()
    .eq("id", id);
  return { error };
}

/**
 * Create a pending transaction.
 */
export async function createTransaction(transaction: {
  wallet_id: string;
  user_id: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  reference: string;
  description: string;
  metadata: Record<string, unknown>;
}) {
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      ...transaction,
      metadata: transaction.metadata as Json,
      status: "pending" as const,
    })
    .select()
    .single();
  return { data, error };
}

/**
 * Invoke a purchase edge function (airtime or data).
 */
export async function invokePurchaseFunction(
  functionName: string,
  body: Record<string, unknown>
) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Session expired. Please log in again.");

  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data;
}

/**
 * Update transaction status via secure edge function.
 */
export async function updateTransactionStatus(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Session expired. Please log in again.");

  const { data, error } = await supabase.functions.invoke(
    "secure-transaction-update/update-status",
    {
      body,
      headers: { Authorization: `Bearer ${session.access_token}` },
    }
  );
  if (error) throw error;
  return data;
}
