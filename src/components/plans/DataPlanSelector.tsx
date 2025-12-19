import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Signal, Info, Flame, Sun, Calendar, Clock, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DATA_PLANS,
  DATA_PLAN_CATEGORIES,
  formatCurrency,
  PRICING_MARGIN,
  NETWORK_PROVIDERS,
  NetworkProvider,
  DataPlan,
  DataPlanCategory,
  getDataPlansByCategory,
} from "@/lib/constants";

interface DataPlanSelectorProps {
  selectedNetwork: NetworkProvider;
  selectedPlan: DataPlan | null;
  onNetworkChange: (network: NetworkProvider) => void;
  onSelectPlan: (plan: DataPlan) => void;
  walletBalance?: number;
  showNetworkSelector?: boolean;
}

const categoryIcons: Record<DataPlanCategory, React.ReactNode> = {
  'HOT': <Flame className="w-3 h-3" />,
  'Daily': <Sun className="w-3 h-3" />,
  'Weekly': <Calendar className="w-3 h-3" />,
  'Monthly': <Clock className="w-3 h-3" />,
  'Always-On': <Zap className="w-3 h-3" />,
};

export function DataPlanSelector({
  selectedNetwork,
  selectedPlan,
  onNetworkChange,
  onSelectPlan,
  walletBalance = 0,
  showNetworkSelector = true,
}: DataPlanSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<DataPlanCategory>("HOT");

  const currentPlans = getDataPlansByCategory(selectedNetwork, activeCategory);

  return (
    <div className="space-y-4">
      {/* Network Selector */}
      {showNetworkSelector && (
        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">
            Select Network
          </label>
          <div className="grid grid-cols-4 gap-2">
            {NETWORK_PROVIDERS.map((network) => (
              <Card
                key={network}
                variant="gradient"
                className={`p-3 cursor-pointer text-center transition-all ${
                  selectedNetwork === network ? "border-accent ring-2 ring-accent/30" : ""
                }`}
                onClick={() => onNetworkChange(network)}
              >
                <Signal className={`w-5 h-5 mx-auto mb-1 ${selectedNetwork === network ? "text-accent" : "text-muted-foreground"}`} />
                <span className="text-xs font-medium">{network}</span>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as DataPlanCategory)}>
        <TabsList className="w-full grid grid-cols-5 h-auto">
          {DATA_PLAN_CATEGORIES.map((category) => (
            <TabsTrigger
              key={category}
              value={category}
              className="text-xs py-2 px-1 flex items-center gap-1"
            >
              {categoryIcons[category]}
              <span className="hidden sm:inline">{category}</span>
              <span className="sm:hidden">{category.slice(0, 3)}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {DATA_PLAN_CATEGORIES.map((category) => (
          <TabsContent key={category} value={category} className="mt-4">
            <TooltipProvider>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-muted-foreground">
                  Prices include {PRICING_MARGIN * 100}% service fee
                </span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">A small service fee is added to cover transaction costs</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>

            <div className="space-y-3">
              {getDataPlansByCategory(selectedNetwork, category).map((plan, index) => {
                const isSelected = selectedPlan?.id === plan.id;
                const isInsufficient = walletBalance < plan.finalPrice;

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      variant="gradient"
                      className={`p-4 cursor-pointer transition-all ${
                        isSelected ? "border-accent ring-2 ring-accent/30" : ""
                      } ${isInsufficient ? "opacity-50" : ""}`}
                      onClick={() => {
                        if (!isInsufficient) {
                          onSelectPlan(plan);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-accent" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-lg">{plan.dataAmount}</span>
                              {plan.tag && (
                                <Badge variant="secondary" className="text-xs bg-accent/20 text-accent">
                                  {plan.tag}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{plan.validity}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-accent font-bold text-lg">{formatCurrency(plan.finalPrice)}</span>
                          {isInsufficient && (
                            <p className="text-xs text-destructive">Insufficient</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}

              {getDataPlansByCategory(selectedNetwork, category).length === 0 && (
                <Card variant="gradient" className="p-8 text-center">
                  <p className="text-muted-foreground">No {category} plans available for {selectedNetwork}</p>
                </Card>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
