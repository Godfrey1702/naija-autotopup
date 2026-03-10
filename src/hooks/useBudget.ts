/**
 * @fileoverview Budget Management Hook
 * 
 * All budget operations go through the src/api service layer.
 * 
 * @module useBudget
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { budgetService } from "@/api";

export interface BudgetData {
  budget_amount: number;
  amount_spent: number;
  remaining: number;
  percentage_used: number;
  last_alert_level: number;
  month_year: string;
}

interface UseBudgetReturn {
  budget: BudgetData | null;
  loading: boolean;
  error: string | null;
  refreshBudget: () => Promise<void>;
  setBudgetAmount: (amount: number) => Promise<{ success: boolean; error?: string }>;
  hasBudget: boolean;
}

export function useBudget(): UseBudgetReturn {
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
      const data = await budgetService.getCurrentBudget();
      setBudget(data as BudgetData);
    } catch (err) {
      console.error("Error fetching budget:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch budget");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const setBudgetAmount = useCallback(async (amount: number): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "Not authenticated" };

    try {
      const data = await budgetService.setBudget(amount);
      setBudget(data as BudgetData);
      return { success: true };
    } catch (err) {
      console.error("Error setting budget:", err);
      return { success: false, error: err instanceof Error ? err.message : "Failed to set budget" };
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
