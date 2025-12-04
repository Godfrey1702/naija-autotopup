import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronLeft, Zap, Plus, Smartphone, Wifi, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TopUpViewProps {
  onBack: () => void;
}

interface Rule {
  id: string;
  type: "airtime" | "data";
  threshold: number;
  thresholdUnit: string;
  amount: number;
  enabled: boolean;
}

export function TopUpView({ onBack }: TopUpViewProps) {
  const [rules, setRules] = useState<Rule[]>([
    { id: "1", type: "data", threshold: 50, thresholdUnit: "MB", amount: 500, enabled: true },
    { id: "2", type: "airtime", threshold: 100, thresholdUnit: "₦", amount: 200, enabled: true },
  ]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState<Partial<Rule>>({
    type: "data",
    threshold: 100,
    amount: 500,
  });

  const toggleRule = (id: string) => {
    setRules(rules.map(rule =>
      rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  const deleteRule = (id: string) => {
    setRules(rules.filter(rule => rule.id !== id));
  };

  const addRule = () => {
    const rule: Rule = {
      id: Date.now().toString(),
      type: newRule.type || "data",
      threshold: newRule.threshold || 100,
      thresholdUnit: newRule.type === "data" ? "MB" : "₦",
      amount: newRule.amount || 500,
      enabled: true,
    };
    setRules([...rules, rule]);
    setIsDialogOpen(false);
    setNewRule({ type: "data", threshold: 100, amount: 500 });
  };

  return (
    <div className="min-h-screen gradient-hero pb-24">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 glass border-b border-border/50 px-5 py-4"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Auto Top-Up</h1>
            <p className="text-sm text-muted-foreground">Manage your rules</p>
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <div className="px-5 py-6 space-y-6">
        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card variant="gradient" className="p-5 border-primary/30">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                <Zap className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">How it works</h3>
                <p className="text-sm text-muted-foreground">
                  Set thresholds for your airtime or data. When your balance drops below the threshold, we automatically top you up from your wallet.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Rules List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Your Rules</h3>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Create Auto Top-Up Rule</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <Card
                        variant="gradient"
                        className={`p-4 cursor-pointer text-center ${
                          newRule.type === "data" ? "border-primary ring-2 ring-primary/30" : ""
                        }`}
                        onClick={() => setNewRule({ ...newRule, type: "data" })}
                      >
                        <Wifi className="w-6 h-6 mx-auto mb-2 text-accent" />
                        <span className="text-sm font-medium">Data</span>
                      </Card>
                      <Card
                        variant="gradient"
                        className={`p-4 cursor-pointer text-center ${
                          newRule.type === "airtime" ? "border-primary ring-2 ring-primary/30" : ""
                        }`}
                        onClick={() => setNewRule({ ...newRule, type: "airtime" })}
                      >
                        <Smartphone className="w-6 h-6 mx-auto mb-2 text-primary" />
                        <span className="text-sm font-medium">Airtime</span>
                      </Card>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      When balance is below ({newRule.type === "data" ? "MB" : "₦"})
                    </label>
                    <Input
                      type="number"
                      value={newRule.threshold}
                      onChange={(e) => setNewRule({ ...newRule, threshold: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Top up amount (₦)
                    </label>
                    <Input
                      type="number"
                      value={newRule.amount}
                      onChange={(e) => setNewRule({ ...newRule, amount: Number(e.target.value) })}
                    />
                  </div>

                  <Button onClick={addRule} className="w-full">
                    Create Rule
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {rules.map((rule, index) => (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card variant="gradient" className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      rule.type === "airtime" ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"
                    }`}>
                      {rule.type === "airtime" ? (
                        <Smartphone className="w-6 h-6" />
                      ) : (
                        <Wifi className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground capitalize">{rule.type}</p>
                      <p className="text-sm text-muted-foreground">
                        Top up ₦{rule.amount.toLocaleString()} when below {rule.threshold}{rule.thresholdUnit}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={() => toggleRule(rule.id)}
                    />
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}

          {rules.length === 0 && (
            <Card variant="gradient" className="p-8 text-center">
              <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">No rules yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first auto top-up rule to never run out again
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
