import { motion } from "framer-motion";
import { Target, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface BudgetCardProps {
  totalBudget: number;
  spent: number;
  onManage: () => void;
}

export function BudgetCard({ totalBudget, spent, onManage }: BudgetCardProps) {
  const percentage = (spent / totalBudget) * 100;
  const remaining = totalBudget - spent;
  const isOverBudget = percentage > 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card variant="gradient" className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center">
              <Target className="w-4 h-4 text-accent-foreground" />
            </div>
            <h3 className="font-semibold text-foreground">Monthly Budget</h3>
          </div>
          <button
            onClick={onManage}
            className="text-sm text-primary flex items-center gap-1 hover:underline"
          >
            Manage
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Spent</span>
            <span className="font-medium text-foreground">
              ₦{spent.toLocaleString()} / ₦{totalBudget.toLocaleString()}
            </span>
          </div>

          <Progress
            value={Math.min(percentage, 100)}
            className={`h-3 ${isOverBudget ? "[&>div]:bg-destructive" : "[&>div]:gradient-gold"}`}
          />

          <div className="flex justify-between items-center">
            <span className={`text-sm font-medium ${isOverBudget ? "text-destructive" : "text-primary"}`}>
              {isOverBudget ? "Over budget!" : `₦${remaining.toLocaleString()} remaining`}
            </span>
            <span className="text-xs text-muted-foreground">
              {percentage.toFixed(0)}% used
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
