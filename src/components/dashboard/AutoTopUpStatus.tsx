import { motion } from "framer-motion";
import { Zap, ChevronRight, Smartphone, Wifi } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface AutoTopUpRule {
  id: string;
  type: "airtime" | "data";
  threshold: string;
  amount: number;
  enabled: boolean;
}

interface AutoTopUpStatusProps {
  rules: AutoTopUpRule[];
  onToggle: (id: string) => void;
  onViewAll: () => void;
}

export function AutoTopUpStatus({ rules, onToggle, onViewAll }: AutoTopUpStatusProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <h3 className="font-semibold text-foreground">Auto Top-Up Rules</h3>
        </div>
        <button
          onClick={onViewAll}
          className="text-sm text-primary flex items-center gap-1 hover:underline"
        >
          Manage
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {rules.map((rule) => (
          <Card key={rule.id} variant="gradient" className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  rule.type === "airtime" ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"
                }`}>
                  {rule.type === "airtime" ? (
                    <Smartphone className="w-5 h-5" />
                  ) : (
                    <Wifi className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-foreground capitalize">{rule.type}</p>
                  <p className="text-xs text-muted-foreground">
                    Top up ₦{rule.amount.toLocaleString()} when below {rule.threshold}
                  </p>
                </div>
              </div>
              <Switch
                checked={rule.enabled}
                onCheckedChange={() => onToggle(rule.id)}
              />
            </div>
          </Card>
        ))}

        {rules.length === 0 && (
          <Card variant="gradient" className="p-6 text-center">
            <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No auto top-up rules set</p>
            <button
              onClick={onViewAll}
              className="text-primary text-sm font-medium mt-2 hover:underline"
            >
              Create your first rule
            </button>
          </Card>
        )}
      </div>
    </motion.div>
  );
}
