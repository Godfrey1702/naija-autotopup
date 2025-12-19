import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronLeft, Zap, Plus, Smartphone, Wifi, Trash2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWallet } from "@/contexts/WalletContext";
import { usePhoneNumbers } from "@/contexts/PhoneNumberContext";
import { useAuth } from "@/contexts/AuthContext";
import { AirtimePlanSelector } from "@/components/plans/AirtimePlanSelector";
import { DataPlanSelector } from "@/components/plans/DataPlanSelector";
import { 
  formatCurrency, 
  NetworkProvider, 
  DataPlan, 
  AirtimePlan,
  NETWORK_PROVIDERS,
} from "@/lib/constants";

interface TopUpViewProps {
  onBack: () => void;
}

export function TopUpView({ onBack }: TopUpViewProps) {
  const { autoTopUpRules, createAutoTopUpRule, deleteAutoTopUpRule, toggleAutoTopUpRule, wallet } = useWallet();
  const { allPhoneNumbers } = usePhoneNumbers();
  const { profile } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ruleType, setRuleType] = useState<"airtime" | "data">("airtime");
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkProvider>("MTN");
  const [selectedDataPlan, setSelectedDataPlan] = useState<DataPlan | null>(null);
  const [selectedAirtimePlan, setSelectedAirtimePlan] = useState<AirtimePlan | null>(null);
  const [threshold, setThreshold] = useState<number>(20);
  const [phoneNumberId, setPhoneNumberId] = useState<string | null>(null);

  const toggleRule = (id: string) => {
    toggleAutoTopUpRule(id);
  };

  const handleDeleteRule = (id: string) => {
    deleteAutoTopUpRule(id);
  };

  const addRule = async () => {
    const amount = ruleType === "airtime" 
      ? (selectedAirtimePlan?.finalPrice || 500)
      : (selectedDataPlan?.finalPrice || 500);
    
    if (!amount) return;

    setIsLoading(true);
    const { error } = await createAutoTopUpRule(
      ruleType, 
      threshold, 
      amount,
      phoneNumberId
    );
    setIsLoading(false);
    
    if (!error) {
      setIsDialogOpen(false);
      setSelectedAirtimePlan(null);
      setSelectedDataPlan(null);
      setThreshold(20);
      setPhoneNumberId(null);
    }
  };

  const getPhoneDisplay = (phoneNumberId: string | null) => {
    if (!phoneNumberId) {
      return profile?.phone_number ? `${profile.phone_number.slice(0, 4)}****${profile.phone_number.slice(-3)}` : "Primary";
    }
    const phone = allPhoneNumbers.find(p => p.id === phoneNumberId);
    if (phone) {
      return `${phone.phone_number.slice(0, 4)}****${phone.phone_number.slice(-3)}`;
    }
    return "Unknown";
  };

  const selectedAmount = ruleType === "airtime" 
    ? (selectedAirtimePlan?.finalPrice || 0)
    : (selectedDataPlan?.finalPrice || 0);

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
              <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Auto Top-Up Rule</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Type Selection */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Top-Up Type
                    </label>
                    <Tabs value={ruleType} onValueChange={(v) => {
                      setRuleType(v as "airtime" | "data");
                      setSelectedAirtimePlan(null);
                      setSelectedDataPlan(null);
                    }}>
                      <TabsList className="w-full grid grid-cols-2">
                        <TabsTrigger value="airtime" className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4" />
                          Airtime
                        </TabsTrigger>
                        <TabsTrigger value="data" className="flex items-center gap-2">
                          <Wifi className="w-4 h-4" />
                          Data
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  {/* Phone Number Selection */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Phone Number
                    </label>
                    <Select 
                      value={phoneNumberId || "primary"} 
                      onValueChange={(val) => setPhoneNumberId(val === "primary" ? null : val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select phone number" />
                      </SelectTrigger>
                      <SelectContent>
                        {allPhoneNumbers.map((phone) => (
                          <SelectItem key={phone.id || "primary"} value={phone.id || "primary"}>
                            <div className="flex items-center gap-2">
                              {phone.is_primary && <Lock className="w-3 h-3 text-primary" />}
                              <span>{phone.phone_number}</span>
                              {phone.network_provider && (
                                <Badge variant="secondary" className="text-xs ml-1">
                                  {phone.network_provider}
                                </Badge>
                              )}
                              {phone.is_primary && (
                                <span className="text-xs text-primary">(Primary)</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Threshold Selection */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Trigger when balance drops below
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[10, 20, 30, 50].map((value) => (
                        <Card
                          key={value}
                          variant="gradient"
                          className={`p-3 cursor-pointer text-center transition-all ${
                            threshold === value ? "border-primary ring-2 ring-primary/30" : ""
                          }`}
                          onClick={() => setThreshold(value)}
                        >
                          <span className="text-lg font-bold">{value}%</span>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Plan Selection */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-3 block">
                      Select {ruleType === "airtime" ? "Airtime Amount" : "Data Plan"}
                    </label>
                    
                    {ruleType === "airtime" ? (
                      <AirtimePlanSelector
                        selectedPlan={selectedAirtimePlan}
                        customAmount=""
                        onSelectPlan={setSelectedAirtimePlan}
                        onCustomAmountChange={() => {}}
                        walletBalance={wallet?.balance || 0}
                        showCustomInput={false}
                      />
                    ) : (
                      <DataPlanSelector
                        selectedNetwork={selectedNetwork}
                        selectedPlan={selectedDataPlan}
                        onNetworkChange={(network) => {
                          setSelectedNetwork(network);
                          setSelectedDataPlan(null);
                        }}
                        onSelectPlan={setSelectedDataPlan}
                        walletBalance={wallet?.balance || 0}
                        showNetworkSelector={true}
                      />
                    )}
                  </div>

                  {/* Summary */}
                  {selectedAmount > 0 && (
                    <Card variant="gradient" className="p-4 border-primary/30">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type</span>
                          <span className="font-medium capitalize">{ruleType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Trigger</span>
                          <span className="font-medium">Below {threshold}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Top-up Amount</span>
                          <span className="font-medium text-primary">{formatCurrency(selectedAmount)}</span>
                        </div>
                      </div>
                    </Card>
                  )}

                  <Button 
                    onClick={addRule} 
                    className="w-full" 
                    disabled={isLoading || selectedAmount <= 0}
                  >
                    {isLoading ? "Creating..." : "Create Rule"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {autoTopUpRules.map((rule, index) => (
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
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground capitalize">{rule.type}</p>
                        <Badge variant="outline" className="text-xs">
                          {getPhoneDisplay(rule.phone_number_id)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Top up {formatCurrency(rule.topup_amount)} when below {rule.threshold_percentage}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={rule.is_enabled}
                      onCheckedChange={() => toggleRule(rule.id)}
                    />
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}

          {autoTopUpRules.length === 0 && (
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
