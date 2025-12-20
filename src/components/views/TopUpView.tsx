import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Zap, Plus, Trash2, ToggleLeft, ToggleRight, Smartphone, Wifi } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWallet, AutoTopUpRule } from "@/contexts/WalletContext";
import { usePhoneNumbers, DisplayPhoneNumber } from "@/contexts/PhoneNumberContext";
import {
  AIRTIME_PLANS,
  DATA_PLANS,
  DATA_PLAN_CATEGORIES,
  NETWORK_PROVIDERS,
  formatCurrency,
  type NetworkProvider,
  type DataPlan,
  type AirtimePlan,
} from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

interface TopUpViewProps {
  onBack: () => void;
}

export function TopUpView({ onBack }: TopUpViewProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [ruleType, setRuleType] = useState<"airtime" | "data">("airtime");
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkProvider>("MTN");
  const [selectedPhoneId, setSelectedPhoneId] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(20);
  const [selectedPlan, setSelectedPlan] = useState<AirtimePlan | DataPlan | null>(null);
  const [dataCategory, setDataCategory] = useState<typeof DATA_PLAN_CATEGORIES[number]>("HOT");
  const [isCreating, setIsCreating] = useState(false);

  const { autoTopUpRules, createAutoTopUpRule, deleteAutoTopUpRule, toggleAutoTopUpRule } = useWallet();
  const { allPhoneNumbers } = usePhoneNumbers();

  const handleCreateRule = async () => {
    if (!selectedPlan) return;
    
    setIsCreating(true);
    await createAutoTopUpRule(ruleType, threshold, selectedPlan.finalPrice, selectedPhoneId);
    setIsCreating(false);
    setShowCreateDialog(false);
    resetForm();
  };

  const resetForm = () => {
    setRuleType("airtime");
    setSelectedNetwork("MTN");
    setSelectedPhoneId(null);
    setThreshold(20);
    setSelectedPlan(null);
    setDataCategory("HOT");
  };

  const getPhoneLabel = (rule: AutoTopUpRule): string => {
    if (!rule.phone_number_id) {
      const primary = allPhoneNumbers.find((p) => p.is_primary);
      return primary?.phone_number || "Primary";
    }
    const phone = allPhoneNumbers.find((p) => p.id === rule.phone_number_id);
    return phone?.phone_number || "Unknown";
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
            <p className="text-sm text-muted-foreground">Manage automatic top-up rules</p>
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <div className="px-5 py-6 space-y-6">
        {/* Intro Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card variant="gradient" className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Never Run Out</h3>
                <p className="text-sm text-muted-foreground">
                  Set up automatic top-ups when your balance drops below a threshold.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Add Rule Button */}
        <Button
          className="w-full gap-2"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="w-4 h-4" />
          Create Auto Top-Up Rule
        </Button>

        {/* Existing Rules */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Your Rules</h3>
          
          {autoTopUpRules.length === 0 ? (
            <Card variant="gradient" className="p-8 text-center">
              <p className="text-muted-foreground text-sm">
                No auto top-up rules yet. Create one to get started.
              </p>
            </Card>
          ) : (
            <AnimatePresence>
              {autoTopUpRules.map((rule, index) => (
                <motion.div
                  key={rule.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card variant="gradient" className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          rule.type === "airtime" ? "bg-primary/20" : "bg-accent/20"
                        }`}>
                          {rule.type === "airtime" ? (
                            <Smartphone className="w-5 h-5 text-primary" />
                          ) : (
                            <Wifi className="w-5 h-5 text-accent" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-foreground capitalize">
                            {rule.type} Auto Top-Up
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {getPhoneLabel(rule)} • Below {rule.threshold_percentage}%
                          </div>
                          <div className="text-sm font-semibold text-primary">
                            {formatCurrency(rule.topup_amount)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleAutoTopUpRule(rule.id)}
                          className="p-2"
                        >
                          {rule.is_enabled ? (
                            <ToggleRight className="w-6 h-6 text-primary" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                          )}
                        </button>
                        <button
                          onClick={() => deleteAutoTopUpRule(rule.id)}
                          className="p-2 text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Create Rule Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Auto Top-Up Rule</DialogTitle>
            <DialogDescription>
              Set up automatic top-ups for your phone number
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Type</label>
              <div className="flex gap-2">
                <Button
                  variant={ruleType === "airtime" ? "default" : "outline"}
                  className="flex-1 gap-2"
                  onClick={() => {
                    setRuleType("airtime");
                    setSelectedPlan(null);
                  }}
                >
                  <Smartphone className="w-4 h-4" />
                  Airtime
                </Button>
                <Button
                  variant={ruleType === "data" ? "default" : "outline"}
                  className="flex-1 gap-2"
                  onClick={() => {
                    setRuleType("data");
                    setSelectedPlan(null);
                  }}
                >
                  <Wifi className="w-4 h-4" />
                  Data
                </Button>
              </div>
            </div>

            {/* Phone Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Phone Number</label>
              <Select
                value={selectedPhoneId || "primary"}
                onValueChange={(v) => {
                  if (v === "primary") {
                    setSelectedPhoneId(null);
                    const primary = allPhoneNumbers.find((p) => p.is_primary);
                    if (primary?.network_provider) {
                      setSelectedNetwork(primary.network_provider as NetworkProvider);
                    }
                  } else {
                    setSelectedPhoneId(v);
                    const phone = allPhoneNumbers.find((p) => p.id === v);
                    if (phone?.network_provider) {
                      setSelectedNetwork(phone.network_provider as NetworkProvider);
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select phone number" />
                </SelectTrigger>
                <SelectContent>
                  {allPhoneNumbers.map((phone) => (
                    <SelectItem key={phone.id || "primary"} value={phone.id || "primary"}>
                      {phone.phone_number} ({phone.label || phone.network_provider || "Primary"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Network Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Network</label>
              <div className="grid grid-cols-4 gap-2">
                {NETWORK_PROVIDERS.map((network) => (
                  <button
                    key={network}
                    onClick={() => {
                      setSelectedNetwork(network);
                      setSelectedPlan(null);
                    }}
                    className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                      selectedNetwork === network
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/50 text-foreground hover:border-primary/50"
                    }`}
                  >
                    {network}
                  </button>
                ))}
              </div>
            </div>

            {/* Threshold */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-foreground">Trigger When Below</label>
                <span className="text-sm font-bold text-primary">{threshold}%</span>
              </div>
              <Slider
                value={[threshold]}
                onValueChange={([v]) => setThreshold(v)}
                min={5}
                max={50}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                Auto top-up will trigger when your balance drops below {threshold}% of average usage
              </p>
            </div>

            {/* Plan Selection */}
            {ruleType === "airtime" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Top-Up Amount</label>
                <div className="grid grid-cols-3 gap-2">
                  {AIRTIME_PLANS.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        selectedPlan?.id === plan.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary/50 hover:border-primary/50"
                      }`}
                    >
                      <div className="text-sm font-bold text-foreground">{formatCurrency(plan.amount)}</div>
                      <div className="text-xs text-muted-foreground">{formatCurrency(plan.finalPrice)}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Data Plan</label>
                <Tabs value={dataCategory} onValueChange={(v) => setDataCategory(v as typeof dataCategory)}>
                  <TabsList className="w-full grid grid-cols-5 h-auto p-1">
                    {DATA_PLAN_CATEGORIES.map((cat) => (
                      <TabsTrigger key={cat} value={cat} className="text-[10px] py-1">
                        {cat}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {DATA_PLAN_CATEGORIES.map((cat) => (
                    <TabsContent key={cat} value={cat} className="mt-2">
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {DATA_PLANS[selectedNetwork]
                          .filter((plan) => plan.category === cat)
                          .map((plan) => (
                            <button
                              key={plan.id}
                              onClick={() => setSelectedPlan(plan)}
                              className={`p-2 rounded-lg border text-left transition-all ${
                                selectedPlan?.id === plan.id
                                  ? "border-primary bg-primary/10"
                                  : "border-border bg-secondary/50 hover:border-primary/50"
                              }`}
                            >
                              <div className="text-sm font-bold text-foreground">{plan.dataAmount}</div>
                              <div className="text-xs text-muted-foreground">{plan.validity}</div>
                              <div className="text-xs font-semibold text-primary">{formatCurrency(plan.finalPrice)}</div>
                            </button>
                          ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            )}

            {/* Create Button */}
            <Button
              className="w-full"
              disabled={!selectedPlan || isCreating}
              onClick={handleCreateRule}
            >
              {isCreating ? "Creating..." : "Create Rule"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
