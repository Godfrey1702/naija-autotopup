/**
 * @fileoverview Budget Settings Component
 * 
 * Provides a form for users to set or update their monthly spending budget.
 * Displays current budget status and allows entering a new budget amount.
 * All budget operations are handled by the backend.
 * 
 * ## Features
 * - View current budget and spending status
 * - Set or update monthly budget amount
 * - Visual progress indicator
 * - Input formatting with thousand separators
 * - Validation (max ₦10,000,000)
 * 
 * ## States
 * - **Loading**: Shows skeleton while fetching current budget
 * - **No Budget**: Shows form to set initial budget
 * - **Has Budget**: Shows current status and form to update
 * 
 * @example
 * import { BudgetSettings } from "@/components/settings/BudgetSettings";
 * 
 * function SettingsPage() {
 *   return (
 *     <div>
 *       <h2>Budget Settings</h2>
 *       <BudgetSettings />
 *     </div>
 *   );
 * }
 * 
 * @module BudgetSettings
 */

import { useState } from "react";
import { Target, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useBudget } from "@/hooks/useBudget";
import { toast } from "sonner";

/**
 * Budget Settings Component.
 * 
 * Allows users to view their current budget status and set/update
 * their monthly spending limit. Includes input validation and
 * formatted number input.
 * 
 * @returns {JSX.Element} The rendered budget settings form
 * 
 * @example
 * <BudgetSettings />
 */
export function BudgetSettings() {
  const { budget, loading, hasBudget, setBudgetAmount, refreshBudget } = useBudget();
  const [inputValue, setInputValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Handles budget form submission.
   * Validates the amount and calls the backend to update.
   */
  const handleSaveBudget = async () => {
    // Parse input, removing commas
    const amount = Number(inputValue.replace(/,/g, ""));
    
    // Validate amount is positive
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid budget amount");
      return;
    }

    // Enforce maximum budget limit
    if (amount > 10000000) {
      toast.error("Maximum budget is ₦10,000,000");
      return;
    }

    setIsSaving(true);
    const result = await setBudgetAmount(amount);
    setIsSaving(false);

    if (result.success) {
      toast.success("Monthly budget updated successfully");
      setInputValue("");
    } else {
      toast.error(result.error || "Failed to update budget");
    }
  };

  /**
   * Formats input value with thousand separators.
   * Only allows numeric input.
   * 
   * @param {string} value - Raw input value
   * @returns {string} Formatted value with commas
   */
  const formatInputValue = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    if (numericValue) {
      return Number(numericValue).toLocaleString();
    }
    return "";
  };

  // Loading state - show skeleton
  if (loading) {
    return (
      <Card variant="gradient" className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-14 w-full mb-4" />
        <Skeleton className="h-10 w-full" />
      </Card>
    );
  }

  return (
    <Card variant="gradient" className="p-5">
      {/* Header with icon */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center">
          <Target className="w-4 h-4 text-accent-foreground" />
        </div>
        <h3 className="font-semibold text-foreground">Monthly Budget</h3>
      </div>

      {/* Current budget status (only shown if budget exists) */}
      {hasBudget && budget && (
        <div className="mb-4 p-3 rounded-lg bg-secondary/50">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Current Budget</span>
            <span className="font-medium text-foreground">
              ₦{budget.budget_amount.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Spent This Month</span>
            <span className="font-medium text-foreground">
              ₦{budget.amount_spent.toLocaleString()}
            </span>
          </div>
          {/* Visual progress indicator */}
          <Progress
            value={Math.min(budget.percentage_used, 100)}
            className={`h-2 ${budget.percentage_used > 100 ? "[&>div]:bg-destructive" : "[&>div]:gradient-gold"}`}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {budget.percentage_used}% used • {budget.month_year}
          </p>
        </div>
      )}

      {/* Budget input form */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            {hasBudget ? "Update Budget (₦)" : "Set Monthly Budget (₦)"}
          </label>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="e.g., 10,000"
            value={inputValue}
            onChange={(e) => setInputValue(formatInputValue(e.target.value))}
            className="h-14 text-lg"
          />
        </div>

        {/* Threshold notification info */}
        <p className="text-sm text-muted-foreground">
          You'll be notified when you reach 50%, 75%, 90%, and 100% of your budget.
        </p>

        {/* Submit button */}
        <Button 
          onClick={handleSaveBudget} 
          className="w-full"
          disabled={isSaving || !inputValue}
        >
          {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {hasBudget ? "Update Budget" : "Set Budget"}
        </Button>
      </div>
    </Card>
  );
}
