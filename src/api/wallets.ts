/**
 * @fileoverview Wallets Service Layer
 *
 * Abstracts wallet operations. Currently delegates to Supabase.
 * Purchase functions now delegate entirely to edge functions which handle
 * wallet locking, idempotency, retry, and refund atomically.
 *
 * @module api/wallets
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

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
 * Fund wallet via secure edge function (uses atomic fund_wallet_atomic DB function).
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
 * Execute a complete airtime or data purchase through the transaction-safe
 * edge function. The edge function handles the entire lifecycle:
 * 1. Idempotency check
 * 2. Atomic wallet lock & deduction
 * 3. Transaction record creation
 * 4. Provider API call with retry
 * 5. Auto-refund on failure
 * 6. Spending & budget tracking
 *
 * @param type - "airtime" or "data"
 * @param params - Purchase parameters
 * @returns Purchase result with transactionId and reference
 */
export async function executePurchase(
  type: "airtime" | "data",
  params: {
    phoneNumber: string;
    amount: number;
    network: string;
    planId?: string;
    idempotencyKey?: string;
  }
) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Session expired. Please log in again.");

  const functionName = type === "airtime" ? "payflex-airtime-topup" : "payflex-data-topup";

  const { data, error } = await supabase.functions.invoke(functionName, {
    body: params,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) throw error;
  return data;
}

/**
 * Verify a pending_verification transaction against the provider.
 */
export async function verifyTransaction(transactionId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Session expired");

  const { data, error } = await supabase.functions.invoke(
    "secure-transaction-update/verify-transaction",
    {
      body: { transactionId },
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
 * @deprecated Use executePurchase instead. Kept for backward compatibility.
 * Create a pending transaction record.
 */
export async function createTransaction(transaction: {
  wallet_id: string;
  user_id: string;
  type: "deposit" | "withdrawal" | "airtime_purchase" | "data_purchase" | "auto_topup";
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
      wallet_id: transaction.wallet_id,
      user_id: transaction.user_id,
      type: transaction.type,
      amount: transaction.amount,
      balance_before: transaction.balance_before,
      balance_after: transaction.balance_after,
      reference: transaction.reference,
      description: transaction.description,
      metadata: transaction.metadata as Json,
      status: "pending" as const,
    })
    .select()
    .single();
  return { data, error };
}

/**
 * @deprecated Use executePurchase instead. Kept for backward compatibility.
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
 * @deprecated Use executePurchase instead. Kept for backward compatibility.
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
