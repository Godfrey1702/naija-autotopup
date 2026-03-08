/**
 * @fileoverview Transactions Service Layer
 * 
 * Abstracts transaction operations. Currently delegates to Supabase.
 * Maps to future backend modules:
 * - payflex-airtime-topup → transactions module
 * - payflex-data-topup → transactions module
 * - scheduled-topups → transactions module
 * 
 * @module api/transactions
 */

import { supabase } from "@/integrations/supabase/client";
// import { api } from "./client"; // Uncomment for future external backend

/**
 * Fetch user transactions.
 * 
 * Current: Supabase direct query
 * Future: GET /transactions
 */
export async function getTransactions(userId: string, limit = 50) {
  // --- Current: Supabase ---
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data, error };

  // --- Future: External Backend ---
  // const { data } = await api.get("/transactions", { params: { limit } });
  // return { data: data.transactions, error: null };
}

/**
 * Create a pending transaction record.
 * 
 * Current: Supabase insert
 * Future: POST /transactions
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
  // --- Current: Supabase ---
  const { data, error } = await supabase
    .from("transactions")
    .insert({ ...transaction, status: "pending" })
    .select()
    .single();
  return { data, error };

  // --- Future: External Backend ---
  // const { data } = await api.post("/transactions", transaction);
  // return { data: data.transaction, error: null };
}

/**
 * Purchase airtime via edge function.
 * 
 * Current: Supabase Edge Function (payflex-airtime-topup)
 * Future: POST /transactions/airtime
 */
export async function purchaseAirtime(params: {
  phoneNumber: string;
  amount: number;
  network: string;
}) {
  // --- Current: Supabase ---
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Session expired");

  const { data, error } = await supabase.functions.invoke("payflex-airtime-topup", {
    body: params,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data;

  // --- Future: External Backend ---
  // const { data } = await api.post("/transactions/airtime", params);
  // return data;
}

/**
 * Purchase data via edge function.
 * 
 * Current: Supabase Edge Function (payflex-data-topup)
 * Future: POST /transactions/data
 */
export async function purchaseData(params: {
  phoneNumber: string;
  amount: number;
  network: string;
  planId?: string;
}) {
  // --- Current: Supabase ---
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Session expired");

  const { data, error } = await supabase.functions.invoke("payflex-data-topup", {
    body: params,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data;

  // --- Future: External Backend ---
  // const { data } = await api.post("/transactions/data", params);
  // return data;
}

/**
 * Update transaction status via secure edge function.
 * 
 * Current: Supabase Edge Function (secure-transaction-update)
 * Future: PATCH /transactions/:id
 */
export async function updateTransactionStatus(params: {
  transactionId: string;
  status: string;
  metadata?: Record<string, unknown>;
  updateWalletBalance?: boolean;
  balanceAfter?: number;
}) {
  // --- Current: Supabase ---
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Session expired");

  const { data, error } = await supabase.functions.invoke(
    "secure-transaction-update/update-status",
    {
      body: params,
      headers: { Authorization: `Bearer ${session.access_token}` },
    }
  );
  if (error) throw error;
  return data;

  // --- Future: External Backend ---
  // const { data } = await api.patch(`/transactions/${params.transactionId}`, params);
  // return data;
}
