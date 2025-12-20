import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Smartphone, Wifi, Check, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWallet } from "@/contexts/WalletContext";
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

interface ManualPurchaseViewProps {
  onBack: () => void;
  initialType?: "airtime" | "data";
}

export function ManualPurchaseView({ onBack, initialType = "airtime" }: ManualPurchaseViewProps) {
  const [purchaseType, setPurchaseType] = useState<"airtime" | "data">(initialType);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkProvider>("MTN");
  const [selectedPlan, setSelectedPlan] = useState<AirtimePlan | DataPlan | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedPhoneId, setSelectedPhoneId] = useState<string | null>(null);
  const [useManualInput, setUseManualInput] = useState(false);
  const [dataCategory, setDataCategory] = useState<typeof DATA_PLAN_CATEGORIES[number]>("HOT");
  const [isProcessing, setIsProcessing] = useState(false);

  const { wallet, purchaseAirtimeOrData } = useWallet();
  const { allPhoneNumbers } = usePhoneNumbers();
  const balance = wallet?.balance || 0;

  const handlePhoneSelect = (phone: DisplayPhoneNumber) => {
    setPhoneNumber(phone.phone_number);
    setSelectedPhoneId(phone.id);
    setSelectedNetwork((phone.network_provider as NetworkProvider) || "MTN");
    setUseManualInput(false);
  };

  const handleManualPhoneChange = (value: string) => {
    setPhoneNumber(value);
    setSelectedPhoneId(null);
    setUseManualInput(true);
  };

  const getPurchaseAmount = (): number => {
    if (purchaseType === "airtime" && customAmount) {
      return parseInt(customAmount, 10) || 0;
    }
    return selectedPlan?.finalPrice || 0;
  };

  const purchaseAmount = getPurchaseAmount();
  const canPurchase = phoneNumber.length >= 10 && purchaseAmount > 0 && purchaseAmount <= balance;

  const handlePurchase = async () => {
    if (!canPurchase) return;
    
    setIsProcessing(true);
    const { error } = await purchaseAirtimeOrData(
      purchaseType,
      purchaseAmount,
      phoneNumber,
      selectedPhoneId
    );
    setIsProcessing(false);

    if (!error) {
      setSelectedPlan(null);
      setCustomAmount("");
      onBack();
    }
  };

  const filteredDataPlans = DATA_PLANS[selectedNetwork].filter(
    (plan) => plan.category === dataCategory
  );

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
            <h1 className="text-xl font-bold text-foreground">Buy {purchaseType === "airtime" ? "Airtime" : "Data"}</h1>
            <p className="text-sm text-muted-foreground">Balance: {formatCurrency(balance)}</p>
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <div className="px-5 py-6 space-y-6">
        {/* Type Toggle */}
        <div className="flex gap-2">
          <Button
            variant={purchaseType === "airtime" ? "default" : "outline"}
            className="flex-1 gap-2"
            onClick={() => {
              setPurchaseType("airtime");
              setSelectedPlan(null);
            }}
          >
            <Smartphone className="w-4 h-4" />
            Airtime
          </Button>
          <Button
            variant={purchaseType === "data" ? "default" : "outline"}
            className="flex-1 gap-2"
            onClick={() => {
              setPurchaseType("data");
              setSelectedPlan(null);
              setCustomAmount("");
            }}
          >
            <Wifi className="w-4 h-4" />
            Data
          </Button>
        </div>

        {/* Phone Number Selection */}
        <Card variant="gradient" className="p-4 space-y-3">
          <h3 className="text-sm font-medium text-foreground">Phone Number</h3>
          
          {/* Saved Numbers */}
          {allPhoneNumbers.length > 0 && !useManualInput && (
            <div className="flex flex-wrap gap-2">
              {allPhoneNumbers.map((phone) => (
                <button
                  key={phone.id || "primary"}
                  onClick={() => handlePhoneSelect(phone)}
                  className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                    phoneNumber === phone.phone_number && !useManualInput
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/50 text-foreground hover:border-primary/50"
                  }`}
                >
                  <div className="font-medium">{phone.phone_number}</div>
                  <div className="text-xs text-muted-foreground">
                    {phone.label || phone.network_provider || "Unknown"}
                  </div>
                </button>
              ))}
              <button
                onClick={() => {
                  setUseManualInput(true);
                  setPhoneNumber("");
                  setSelectedPhoneId(null);
                }}
                className="px-3 py-2 rounded-lg text-sm border border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-foreground transition-all"
              >
                + Other
              </button>
            </div>
          )}

          {/* Manual Input */}
          {(useManualInput || allPhoneNumbers.length === 0) && (
            <div className="space-y-2">
              <Input
                type="tel"
                placeholder="Enter phone number"
                value={phoneNumber}
                onChange={(e) => handleManualPhoneChange(e.target.value)}
                className="bg-secondary/50"
              />
              {allPhoneNumbers.length > 0 && (
                <button
                  onClick={() => setUseManualInput(false)}
                  className="text-sm text-primary hover:underline"
                >
                  Use saved number
                </button>
              )}
            </div>
          )}
        </Card>

        {/* Network Selection (for data or manual phone) */}
        {(purchaseType === "data" || useManualInput) && (
          <Card variant="gradient" className="p-4 space-y-3">
            <h3 className="text-sm font-medium text-foreground">Network</h3>
            <div className="grid grid-cols-4 gap-2">
              {NETWORK_PROVIDERS.map((network) => (
                <button
                  key={network}
                  onClick={() => {
                    setSelectedNetwork(network);
                    setSelectedPlan(null);
                  }}
                  className={`py-3 rounded-lg text-sm font-medium border transition-all ${
                    selectedNetwork === network
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/50 text-foreground hover:border-primary/50"
                  }`}
                >
                  {network}
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Airtime Plans */}
        <AnimatePresence mode="wait">
          {purchaseType === "airtime" && (
            <motion.div
              key="airtime"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <Card variant="gradient" className="p-4 space-y-3">
                <h3 className="text-sm font-medium text-foreground">Select Amount</h3>
                <div className="grid grid-cols-3 gap-2">
                  {AIRTIME_PLANS.map((plan) => {
                    const isSelected = selectedPlan?.id === plan.id && !customAmount;
                    const insufficientBalance = plan.finalPrice > balance;
                    
                    return (
                      <button
                        key={plan.id}
                        onClick={() => {
                          setSelectedPlan(plan);
                          setCustomAmount("");
                        }}
                        disabled={insufficientBalance}
                        className={`relative p-3 rounded-lg border transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10"
                            : insufficientBalance
                            ? "border-border bg-secondary/30 opacity-50 cursor-not-allowed"
                            : "border-border bg-secondary/50 hover:border-primary/50"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-primary-foreground" />
                          </div>
                        )}
                        <div className="text-lg font-bold text-foreground">{formatCurrency(plan.amount)}</div>
                        <div className="text-xs text-muted-foreground">Pay {formatCurrency(plan.finalPrice)}</div>
                        {plan.cashback && (
                          <div className="text-xs text-primary mt-1">+₦{plan.cashback} bonus</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Card>

              {/* Custom Amount */}
              <Card variant="gradient" className="p-4 space-y-3">
                <h3 className="text-sm font-medium text-foreground">Or Enter Custom Amount</h3>
                <Input
                  type="number"
                  placeholder="Enter amount (₦)"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedPlan(null);
                  }}
                  className="bg-secondary/50"
                />
                {customAmount && (
                  <p className="text-sm text-muted-foreground">
                    You'll pay: {formatCurrency(Math.ceil(parseInt(customAmount, 10) * 1.05))}
                  </p>
                )}
              </Card>
            </motion.div>
          )}

          {/* Data Plans */}
          {purchaseType === "data" && (
            <motion.div
              key="data"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <Card variant="gradient" className="p-4 space-y-3">
                <h3 className="text-sm font-medium text-foreground">Select Plan</h3>
                
                <Tabs value={dataCategory} onValueChange={(v) => setDataCategory(v as typeof dataCategory)}>
                  <TabsList className="w-full grid grid-cols-5 h-auto p-1">
                    {DATA_PLAN_CATEGORIES.map((cat) => (
                      <TabsTrigger key={cat} value={cat} className="text-xs py-1.5">
                        {cat}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {DATA_PLAN_CATEGORIES.map((cat) => (
                    <TabsContent key={cat} value={cat} className="mt-3">
                      <div className="grid grid-cols-2 gap-2">
                        {DATA_PLANS[selectedNetwork]
                          .filter((plan) => plan.category === cat)
                          .map((plan) => {
                            const isSelected = selectedPlan?.id === plan.id;
                            const insufficientBalance = plan.finalPrice > balance;

                            return (
                              <button
                                key={plan.id}
                                onClick={() => setSelectedPlan(plan)}
                                disabled={insufficientBalance}
                                className={`relative p-3 rounded-lg border text-left transition-all ${
                                  isSelected
                                    ? "border-primary bg-primary/10"
                                    : insufficientBalance
                                    ? "border-border bg-secondary/30 opacity-50 cursor-not-allowed"
                                    : "border-border bg-secondary/50 hover:border-primary/50"
                                }`}
                              >
                                {isSelected && (
                                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                                  </div>
                                )}
                                {plan.tag && (
                                  <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary/20 text-primary mb-1">
                                    {plan.tag}
                                  </span>
                                )}
                                <div className="text-lg font-bold text-foreground">{plan.dataAmount}</div>
                                <div className="text-xs text-muted-foreground">{plan.validity}</div>
                                <div className="text-sm font-semibold text-primary mt-1">
                                  {formatCurrency(plan.finalPrice)}
                                </div>
                              </button>
                            );
                          })}
                        {DATA_PLANS[selectedNetwork].filter((p) => p.category === cat).length === 0 && (
                          <div className="col-span-2 py-8 text-center text-muted-foreground text-sm">
                            No plans available in this category
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Purchase Summary */}
        {purchaseAmount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card variant="gradient" className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Amount</span>
                <span className="text-xl font-bold text-foreground">{formatCurrency(purchaseAmount)}</span>
              </div>
              
              {purchaseAmount > balance && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Insufficient balance
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                disabled={!canPurchase || isProcessing}
                onClick={handlePurchase}
              >
                {isProcessing ? "Processing..." : `Buy ${purchaseType === "airtime" ? "Airtime" : "Data"}`}
              </Button>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
