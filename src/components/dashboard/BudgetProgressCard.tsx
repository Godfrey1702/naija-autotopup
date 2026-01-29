/**
 * @fileoverview Budget Progress Card Component
 * 
 * Displays the user's monthly budget progress on the dashboard.
 * Shows a visual progress bar, spending amounts, and remaining balance.
 * This component is display-only - all calculations are done server-side.
 * 
 * ## States
 * - **Loading**: Shows skeleton placeholder while fetching
 * - **No Budget**: Prompts user to set a budget with link to settings
 * - **Active Budget**: Shows progress bar with spent/remaining amounts
 * - **Over Budget**: Shows warning state when spending exceeds budget
 * 
 * ## Design
 * Uses a gradient card design with the Target icon.
 * Progress bar changes color based on budget status:
 * - Normal: Gold gradient
 * - Over budget: Destructive red
 * 
 * @example
 * import { BudgetProgressCard } from "@/components/dashboard/BudgetProgressCard";
 * 
 * function Dashboard() {
 *   return (
 *     <BudgetProgressCard onManage={() => navigate("/settings")} />
 *   );
 * }
 * 
 * @module BudgetProgressCard
 */

import { Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useBudget } from "@/hooks/useBudget";

/**
 * Props for the BudgetProgressCard component.
 * 
 * @interface BudgetProgressCardProps
 */
interface BudgetProgressCardProps {
  /** Callback when user clicks "Manage" or "Set Budget" link */
  onManage?: () => void;
}

/**
 * Budget Progress Card Component.
 * 
 * Displays the user's monthly budget status with a progress bar.
 * Fetches data from the backend via the useBudget hook.
 * 
 * @param {BudgetProgressCardProps} props - Component props
 * @returns {JSX.Element} The rendered budget card
 * 
 * @example
 * // Basic usage
 * <BudgetProgressCard />
 * 
 * // With navigation to settings
 * <BudgetProgressCard onManage={() => setActiveTab("settings")} />
 */
export function BudgetProgressCard({ onManage }: BudgetProgressCardProps) {
  const { budget, loading, hasBudget } = useBudget();

  // Loading state - show skeleton placeholder
  if (loading) {
    return (
      <Card variant="gradient" className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </Card>
    );
  }

  // No budget state - prompt user to set one
  if (!hasBudget) {
    return (
      <Card variant="gradient" className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Target className="w-4 h-4 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground">Monthly Budget</h3>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Set a monthly spending limit to track your airtime & data expenses.
        </p>
        {onManage && (
          <button
            onClick={onManage}
            className="text-sm text-primary font-medium hover:underline"
          >
            Set Budget →
          </button>
        )}
      </Card>
    );
  }

  // Active budget state - extract values from budget data
  const { budget_amount, amount_spent, remaining, percentage_used } = budget!;
  
  // Determine if user has exceeded their budget
  const isOverBudget = percentage_used > 100;
  
  // Cap display percentage at 100 for progress bar
  const displayPercentage = Math.min(percentage_used, 100);

  return (
    <Card variant="gradient" className="p-5">
      {/* Header with icon and manage link */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isOverBudget ? "bg-destructive/20" : "gradient-gold"}`}>
            <Target className={`w-4 h-4 ${isOverBudget ? "text-destructive" : "text-accent-foreground"}`} />
          </div>
          <h3 className="font-semibold text-foreground">Monthly Budget</h3>
        </div>
        {onManage && (
          <button
            onClick={onManage}
            className="text-sm text-primary hover:underline"
          >
            Manage →
          </button>
        )}
      </div>

      {/* Budget details */}
      <div className="space-y-3">
        {/* Spent vs Budget amount */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Spent</span>
          <span className="font-medium text-foreground">
            ₦{amount_spent.toLocaleString()} / ₦{budget_amount.toLocaleString()}
          </span>
        </div>

        {/* Visual progress bar */}
        <Progress
          value={displayPercentage}
          className={`h-3 ${isOverBudget ? "[&>div]:bg-destructive" : "[&>div]:gradient-gold"}`}
        />

        {/* Remaining amount and percentage */}
        <div className="flex justify-between items-center">
          <span className={`text-sm font-medium ${isOverBudget ? "text-destructive" : "text-primary"}`}>
            {isOverBudget 
              ? `₦${Math.abs(remaining).toLocaleString()} over budget!` 
              : `₦${remaining.toLocaleString()} remaining`}
          </span>
          <span className="text-xs text-muted-foreground">
            {percentage_used}% used
          </span>
        </div>
      </div>
    </Card>
  );
}
