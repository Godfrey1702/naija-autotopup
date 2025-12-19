import { motion } from "framer-motion";
import { CheckCircle2, Gift } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AIRTIME_PLANS, formatCurrency, AirtimePlan } from "@/lib/constants";

interface AirtimePlanSelectorProps {
  selectedPlan: AirtimePlan | null;
  customAmount: string;
  onSelectPlan: (plan: AirtimePlan) => void;
  onCustomAmountChange: (amount: string) => void;
  walletBalance?: number;
  showCustomInput?: boolean;
}

export function AirtimePlanSelector({
  selectedPlan,
  customAmount,
  onSelectPlan,
  onCustomAmountChange,
  walletBalance = 0,
  showCustomInput = true,
}: AirtimePlanSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {AIRTIME_PLANS.map((plan, index) => {
          const isSelected = selectedPlan?.id === plan.id && !customAmount;
          const isInsufficient = walletBalance < plan.finalPrice;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                variant="gradient"
                className={`p-3 cursor-pointer text-center transition-all relative ${
                  isSelected ? "border-primary ring-2 ring-primary/30" : ""
                } ${isInsufficient ? "opacity-50" : ""}`}
                onClick={() => {
                  if (!isInsufficient) {
                    onSelectPlan(plan);
                    onCustomAmountChange("");
                  }
                }}
              >
                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 text-primary absolute top-2 right-2" />
                )}
                <span className="text-lg font-bold block">{formatCurrency(plan.amount)}</span>
                <span className="text-xs text-muted-foreground block">
                  Pay {formatCurrency(plan.finalPrice)}
                </span>
                {plan.cashback && (
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Gift className="w-3 h-3 text-accent" />
                    <span className="text-xs text-accent">{plan.cashback}</span>
                  </div>
                )}
                {isInsufficient && (
                  <p className="text-xs text-destructive mt-1">Insufficient</p>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      {showCustomInput && (
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">
            Or enter custom amount
          </label>
          <Input
            type="number"
            placeholder="Enter amount (e.g., 1500)"
            value={customAmount}
            onChange={(e) => onCustomAmountChange(e.target.value)}
            className="text-lg"
          />
          {customAmount && Number(customAmount) > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              You'll pay approximately {formatCurrency(Math.ceil(Number(customAmount) * 1.05))} (inc. 5% fee)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
