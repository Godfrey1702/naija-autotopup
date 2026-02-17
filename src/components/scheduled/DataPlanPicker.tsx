import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DATA_PLANS, DATA_PLAN_CATEGORIES, formatCurrency, type NetworkProvider, type DataPlan, type DataPlanCategory } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface DataPlanPickerProps {
  network: string;
  selectedPlanId: string;
  onSelect: (plan: DataPlan) => void;
}

export function DataPlanPicker({ network, selectedPlanId, onSelect }: DataPlanPickerProps) {
  const plans = DATA_PLANS[network as NetworkProvider] || [];
  const availableCategories = DATA_PLAN_CATEGORIES.filter(
    (cat) => plans.some((p) => p.category === cat)
  );
  const [category, setCategory] = useState<DataPlanCategory>(availableCategories[0] || "Monthly");

  const filtered = plans.filter((p) => p.category === category);

  return (
    <div className="space-y-2">
      <Label>Data Package</Label>
      <Tabs value={category} onValueChange={(v) => setCategory(v as DataPlanCategory)}>
        <TabsList className="w-full flex-wrap h-auto gap-1">
          {availableCategories.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="text-xs flex-1 min-w-[60px]">
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>
        {availableCategories.map((cat) => (
          <TabsContent key={cat} value={cat} className="mt-3">
            <div className="grid grid-cols-2 gap-2">
              {filtered.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => onSelect(plan)}
                  className={cn(
                    "relative p-3 rounded-xl border text-left transition-all",
                    selectedPlanId === plan.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {plan.tag && (
                    <Badge variant="secondary" className="absolute -top-2 right-2 text-[9px]">
                      {plan.tag}
                    </Badge>
                  )}
                  <p className="font-bold text-foreground text-sm">{plan.dataAmount}</p>
                  <p className="text-xs text-muted-foreground">{plan.validity}</p>
                  <p className="text-xs font-semibold text-primary mt-1">{formatCurrency(plan.finalPrice)}</p>
                </button>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
      {!selectedPlanId && (
        <p className="text-xs text-destructive">Please select a data package</p>
      )}
    </div>
  );
}
