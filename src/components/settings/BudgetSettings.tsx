import { useState } from "react";
import { Target, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useBudget } from "@/hooks/useBudget";
import { toast } from "sonner";

export function BudgetSettings() {
  const { budget, loading, hasBudget, setBudgetAmount, refreshBudget } = useBudget();
  const [inputValue, setInputValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveBudget = async () => {
    const amount = Number(inputValue.replace(/,/g, ""));
    
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid budget amount");
      return;
    }

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

  const formatInputValue = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    if (numericValue) {
      return Number(numericValue).toLocaleString();
    }
    return "";
  };

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
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center">
          <Target className="w-4 h-4 text-accent-foreground" />
        </div>
        <h3 className="font-semibold text-foreground">Monthly Budget</h3>
      </div>

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
          <Progress
            value={Math.min(budget.percentage_used, 100)}
            className={`h-2 ${budget.percentage_used > 100 ? "[&>div]:bg-destructive" : "[&>div]:gradient-gold"}`}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {budget.percentage_used}% used • {budget.month_year}
          </p>
        </div>
      )}

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

        <p className="text-sm text-muted-foreground">
          You'll be notified when you reach 50%, 75%, 90%, and 100% of your budget.
        </p>

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
