/**
 * @fileoverview Scheduled Top-Ups Service Layer
 * 
 * Abstracts scheduled top-up CRUD operations via edge functions.
 * 
 * @module api/scheduled-topups
 */

import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scheduled-topups`;

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Session expired");
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

/**
 * Fetch all scheduled top-ups for the current user.
 */
export async function getScheduledTopUps() {
  const headers = await getAuthHeaders();
  const res = await fetch(FUNCTIONS_BASE, { method: "GET", headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to fetch schedules");
  return data;
}

/**
 * Create a new scheduled top-up.
 */
export async function createScheduledTopUp(payload: Record<string, unknown>) {
  const headers = await getAuthHeaders();
  const res = await fetch(FUNCTIONS_BASE, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to create schedule");
  if (!data?.success) throw new Error(data?.error || "Failed to create schedule");
  return data;
}

/**
 * Update an existing scheduled top-up.
 */
export async function updateScheduledTopUp(id: string, updates: Record<string, unknown>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FUNCTIONS_BASE}?id=${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to update");
  if (!data?.success) throw new Error(data?.error || "Failed to update");
  return data;
}

/**
 * Cancel a scheduled top-up.
 */
export async function cancelScheduledTopUp(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FUNCTIONS_BASE}?id=${id}`, {
    method: "DELETE",
    headers,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to cancel");
  if (!data?.success) throw new Error(data?.error || "Failed to cancel");
  return data;
}
