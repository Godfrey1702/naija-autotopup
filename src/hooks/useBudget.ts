/**
 * @fileoverview Budget Management Hook
 * 
 * This hook provides access to the user's monthly budget data and operations.
 * All budget logic is handled by the backend to prevent frontend manipulation.
 * The hook only fetches and displays data - it performs no calculations.
 * 
 * ## Features
 * - Fetch current month's budget status
 * - Set or update monthly budget amount
 * - Real-time budget tracking (amount spent, remaining, percentage)
 * - Automatic refresh on user change
 * 
 * ## Backend Integration
 * This hook calls the `budget-management` edge function for all operations.
 * The backend handles:
 * - Budget calculations
 * - Threshold tracking
 * - Alert notifications (50%, 75%, 90%, 100%)
 * 
 * @example
 * import { useBudget } from "@/hooks/useBudget";
 * 
 * function BudgetCard() {
 *   const { budget, loading, hasBudget, setBudgetAmount } = useBudget();
 *   
 *   if (loading) return <Skeleton />;
 *   if (!hasBudget) return <SetBudgetPrompt onSet={setBudgetAmount} />;
 *   
 *   return (
 *     <div>
 *       <Progress value={budget.percentage_used} />
 *       <span>₦{budget.remaining.toLocaleString()} remaining</span>
 *     </div>
 *   );
 * }
 * 
 * @module useBudget
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Budget data structure returned from the backend.
 * All values are calculated server-side.
 * 
 * @interface BudgetData
 */
export interface BudgetData {
  /** The set monthly budget limit in NGN */
  budget_amount: number;
  /** Total amount spent this month in NGN */
  amount_spent: number;
  /** Remaining budget (can be negative if over budget) */
  remaining: number;
  /** Percentage of budget used (can exceed 100) */
  percentage_used: number;
  /** Last notification threshold reached (0, 50, 75, 90, 100) */
  last_alert_level: number;
  /** Current month in YYYY-MM format */
  month_year: string;
}

/**
 * Hook return type for budget operations.
 * 
 * @interface UseBudgetReturn
 */
interface UseBudgetReturn {
  /** Current budget data or null if not set/loading */
  budget: BudgetData | null;
  /** Whether budget data is being fetched */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Manually refresh budget data */
  refreshBudget: () => Promise<void>;
  /** Set or update the monthly budget amount */
  setBudgetAmount: (amount: number) => Promise<{ success: boolean; error?: string }>;
  /** Convenience flag: true if budget is set and > 0 */
  hasBudget: boolean;
}

/**
 * Custom hook for managing user monthly budgets.
 * 
 * This hook fetches budget data from the backend and provides
 * methods to update the budget. All calculations are performed
 * server-side to ensure data integrity.
 * 
 * @returns {UseBudgetReturn} Budget state and operations
 * 
 * @example
 * const { budget, loading, hasBudget, setBudgetAmount, refreshBudget } = useBudget();
 */
export function useBudget(): UseBudgetReturn {
  const { user } = useAuth();
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches the current month's budget from the backend.
   * Called automatically on mount and when user changes.
   */
  const fetchBudget = useCallback(async () => {
    if (!user) {
      setBudget(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Verify session is active
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("No active session");
      }

      // Call budget-management edge function
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

  /**
   * Sets or updates the monthly budget amount.
   * 
   * @param {number} amount - New budget amount in NGN (must be > 0)
   * @returns {Promise<{ success: boolean; error?: string }>} Result object
   * 
   * @example
   * const result = await setBudgetAmount(10000);
   * if (result.success) {
   *   toast.success("Budget updated!");
   * } else {
   *   toast.error(result.error);
   * }
   */
  const setBudgetAmount = useCallback(async (amount: number): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    try {
      // Call budget-management edge function to set budget
      const response = await supabase.functions.invoke("budget-management", {
        method: "POST",
        body: { budget_amount: amount },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to set budget");
      }

      // Update local state with response
      setBudget(response.data as BudgetData);
      return { success: true };
    } catch (err) {
      console.error("Error setting budget:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to set budget";
      return { success: false, error: errorMessage };
    }
  }, [user]);

  // Fetch budget on mount and when user changes
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
