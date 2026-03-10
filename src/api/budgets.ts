/**
 * @fileoverview Budgets Service Layer
 * 
 * Abstracts budget and spending analytics operations.
 * 
 * @module api/budgets
 */

import { supabase } from "@/integrations/supabase/client";
// import { api } from "./client"; // Uncomment for future external backend

/**
 * Fetch spending analytics.
 */
export async function getSpendingAnalytics() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No active session");

  const { data, error } = await supabase.functions.invoke("spending-analytics", {
    body: null,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

/**
 * Fetch current month's budget.
 */
export async function getCurrentBudget() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No active session");

  const response = await supabase.functions.invoke("budget-management/current", {
    method: "GET",
  });
  if (response.error) throw new Error(response.error.message || "Failed to fetch budget");
  return response.data;
}

/**
 * Set or update the monthly budget amount.
 */
export async function setBudget(budgetAmount: number) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No active session");

  const response = await supabase.functions.invoke("budget-management", {
    method: "POST",
    body: { budget_amount: budgetAmount },
  });
  if (response.error) throw new Error(response.error.message || "Failed to set budget");
  return response.data;
}
