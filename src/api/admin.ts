/**
 * @fileoverview Admin Service Layer
 * 
 * Provides admin-specific API operations using service role via edge functions.
 * All admin queries go through edge functions to use service_role access.
 * 
 * @module api/admin
 */

import { supabase } from "@/integrations/supabase/client";

const ADMIN_FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api`;

async function getAdminHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Session expired");
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

async function adminFetch(action: string, params: Record<string, unknown> = {}) {
  const headers = await getAdminHeaders();
  const res = await fetch(ADMIN_FUNCTIONS_BASE, {
    method: "POST",
    headers,
    body: JSON.stringify({ action, ...params }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Admin API error: ${action}`);
  return data;
}

/**
 * Check if the current user has admin role.
 */
export async function checkAdminRole(): Promise<boolean> {
  try {
    const data = await adminFetch("check_role");
    return data?.is_admin === true;
  } catch {
    return false;
  }
}

/**
 * Fetch dashboard overview metrics.
 */
export async function getDashboardMetrics() {
  return adminFetch("dashboard_metrics");
}

/**
 * Fetch all users with pagination and search.
 */
export async function getUsers(params: { page?: number; limit?: number; search?: string } = {}) {
  return adminFetch("get_users", params);
}

/**
 * Fetch a single user's details.
 */
export async function getUserDetails(userId: string) {
  return adminFetch("get_user_details", { userId });
}

/**
 * Fetch all transactions with filters.
 */
export async function getTransactions(params: {
  page?: number;
  limit?: number;
  userId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}) {
  return adminFetch("get_transactions", params);
}

/**
 * Fetch all wallets with balances.
 */
export async function getWallets(params: { page?: number; limit?: number; search?: string } = {}) {
  return adminFetch("get_wallets", params);
}

/**
 * Fetch all scheduled top-ups.
 */
export async function getScheduledTopUps(params: { page?: number; limit?: number; status?: string } = {}) {
  return adminFetch("get_scheduled_topups", params);
}

/**
 * Fetch analytics data.
 */
export async function getAnalytics(params: { period?: string } = {}) {
  return adminFetch("get_analytics", params);
}

/**
 * Admin wallet adjustment (credit/debit).
 */
export async function adjustWallet(params: { userId: string; amount: number; type: "credit" | "debit"; reason: string }) {
  return adminFetch("adjust_wallet", params);
}
