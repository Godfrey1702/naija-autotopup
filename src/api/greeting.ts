/**
 * @fileoverview Greeting Service Layer
 * 
 * Abstracts the server-driven greeting fetch.
 * 
 * @module api/greeting
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch time-appropriate greeting from the backend.
 */
export async function getGreeting(): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("get-greeting");
  if (error) {
    console.error("Error fetching greeting:", error);
    return null;
  }
  return data?.greeting ?? null;
}
