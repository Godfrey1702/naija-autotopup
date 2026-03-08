/**
 * @fileoverview Budgets Service Layer
 * 
 * Abstracts budget and spending analytics operations.
 * Maps to future backend module: spending-analytics → budgets module
 * 
 * @module api/budgets
 */

import { supabase } from "@/integrations/supabase/client";
// import { api } from "./client"; // Uncomment for future external backend

/**
 * Fetch spending analytics.
 * 
 * Current: Supabase Edge Function (spending-analytics)
 * Future: GET /budgets/analytics
 */
export async function getSpendingAnalytics(params?: {
  startDate?: string;
  endDate?: string;
  network?: string;
}) {
  // --- Current: Supabase ---
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No active session");

  const { data, error } = await supabase.functions.invoke("spending-analytics", {
    body: null,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;

  // --- Future: External Backend ---
  // const { data } = await api.get("/budgets/analytics", { params });
  // return data;
}

/**
 * Fetch user budget.
 * 
 * Current: Supabase Edge Function (budget-management)
 * Future: GET /budgets
 */
export async function getBudget() {
  // --- Current: Supabase ---
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No active session");

  const { data, error } = await supabase.functions.invoke("budget-management", {
    body: null,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data;

  // --- Future: External Backend ---
  // const { data } = await api.get("/budgets");
  // return data;
}
