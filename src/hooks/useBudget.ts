import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface BudgetData {
  budget_amount: number;
  amount_spent: number;
  remaining: number;
  percentage_used: number;
  last_alert_level: number;
  month_year: string;
}

export function useBudget() {
  const { user } = useAuth();
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudget = useCallback(async () => {
    if (!user) {
      setBudget(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("No active session");
      }

      const response = await supabase.functions.invoke("budget-management/current", {
        method: "GET",
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to fetch budget");
      }

      setBudget(response.data as BudgetData);
    } catch (err) {
      console.error("Error fetching budget:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch budget");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const setBudgetAmount = useCallback(async (amount: number): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    try {
      const response = await supabase.functions.invoke("budget-management", {
        method: "POST",
        body: { budget_amount: amount },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to set budget");
      }

      setBudget(response.data as BudgetData);
      return { success: true };
    } catch (err) {
      console.error("Error setting budget:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to set budget";
      return { success: false, error: errorMessage };
    }
  }, [user]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  return {
    budget,
    loading,
    error,
    refreshBudget: fetchBudget,
    setBudgetAmount,
    hasBudget: budget !== null && budget.budget_amount > 0,
  };
}
