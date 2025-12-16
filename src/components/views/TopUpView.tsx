import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronLeft, Zap, Plus, Smartphone, Wifi, Trash2, Phone, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

interface TopUpViewProps {
  onBack: () => void;
}

export function TopUpView({ onBack }: TopUpViewProps) {
  const { autoTopUpRules, createAutoTopUpRule, deleteAutoTopUpRule, toggleAutoTopUpRule } = useWallet();
  const { allPhoneNumbers } = usePhoneNumbers();
  const { profile } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newRule, setNewRule] = useState<{
    type: "data" | "airtime";
    threshold: number;
    amount: number;
    phoneNumberId: string | null;
  }>({
    type: "data",
    threshold: 20,
    amount: 500,
    phoneNumberId: null, // null = primary phone
  });

  const toggleRule = (id: string) => {
    toggleAutoTopUpRule(id);
  };

  const handleDeleteRule = (id: string) => {
    deleteAutoTopUpRule(id);
  };

  const addRule = async () => {
    setIsLoading(true);
    const { error } = await createAutoTopUpRule(
      newRule.type, 
      newRule.threshold, 
      newRule.amount,
      newRule.phoneNumberId
    );
    setIsLoading(false);
    
    if (!error) {
      setIsDialogOpen(false);
      setNewRule({ type: "data", threshold: 20, amount: 500, phoneNumberId: null });
    }
  };

  // Get phone number display for a rule
  const getPhoneDisplay = (phoneNumberId: string | null) => {
    if (!phoneNumberId) {
      // Primary phone
      return profile?.phone_number ? `${profile.phone_number.slice(0, 4)}****${profile.phone_number.slice(-3)}` : "Primary";
    }
    const phone = allPhoneNumbers.find(p => p.id === phoneNumberId);
    if (phone) {
      return `${phone.phone_number.slice(0, 4)}****${phone.phone_number.slice(-3)}`;
    }
    return "Unknown";
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
                      When balance drops below (%)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={newRule.threshold}
                      onChange={(e) => setNewRule({ ...newRule, threshold: Number(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Percentage threshold to trigger auto top-up
                    </p>
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

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Phone Number
                    </label>
                    <Select 
                      value={newRule.phoneNumberId || "primary"} 
                      onValueChange={(val) => setNewRule({ ...newRule, phoneNumberId: val === "primary" ? null : val })}
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Select which phone number this rule applies to
                    </p>
                  </div>

                  <Button onClick={addRule} className="w-full" disabled={isLoading}>
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
                        Top up ₦{rule.topup_amount.toLocaleString()} when below {rule.threshold_percentage}%
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
