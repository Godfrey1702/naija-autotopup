import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  Smartphone, 
  Wifi, 
  Check, 
  AlertCircle, 
  CheckCircle2,
  Loader2,
  Info,
  Phone,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWallet } from "@/contexts/WalletContext";
import { usePhoneNumbers, DisplayPhoneNumber } from "@/contexts/PhoneNumberContext";
import { validateNigerianPhoneNumber, validatePurchaseAmount, formatPhoneNumber } from "@/lib/validation";
import {
  AIRTIME_PLANS,
  DATA_PLANS,
  DATA_PLAN_CATEGORIES,
  NETWORK_PROVIDERS,
  formatCurrency,
  PAYMENT_LIMITS,
  type NetworkProvider,
  type DataPlan,
  type AirtimePlan,
} from "@/lib/constants";

interface ManualPurchaseViewProps {
  onBack: () => void;
  initialType?: "airtime" | "data";
}

// Step indicator component
function StepIndicator({ step, currentStep, label }: { step: number; currentStep: number; label: string }) {
  const isComplete = currentStep > step;
  const isCurrent = currentStep === step;
  
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
          isComplete
            ? "bg-primary text-primary-foreground"
            : isCurrent
            ? "bg-primary/20 text-primary border-2 border-primary"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {isComplete ? <Check className="w-3 h-3" /> : step}
      </div>
      <span
        className={`text-sm ${
          isCurrent ? "text-foreground font-medium" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

// Validation message component
function ValidationMessage({ 
  isValid, 
  error, 
  success 
}: { 
  isValid: boolean; 
  error?: string; 
  success?: string;
}) {
  if (!error && !success) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className={`flex items-center gap-2 text-sm mt-2 ${
        isValid ? "text-green-600" : "text-destructive"
      }`}
    >
      {isValid ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : (
        <AlertCircle className="w-4 h-4" />
      )}
      <span>{isValid ? success : error}</span>
    </motion.div>
  );
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
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { wallet, purchaseAirtimeOrData } = useWallet();
  const { allPhoneNumbers } = usePhoneNumbers();
  const balance = wallet?.balance || 0;

  // Phone validation
  const phoneValidation = validateNigerianPhoneNumber(phoneNumber);
  const isPhoneValid = phoneNumber.length > 0 && phoneValidation.valid;
  
  // Auto-detect network from phone number for manual input
  useEffect(() => {
    if (useManualInput && phoneValidation.valid && phoneValidation.detectedNetwork) {
      setSelectedNetwork(phoneValidation.detectedNetwork as NetworkProvider);
    }
  }, [phoneNumber, useManualInput, phoneValidation]);

  const handlePhoneSelect = useCallback((phone: DisplayPhoneNumber) => {
    setPhoneNumber(phone.phone_number);
    setSelectedPhoneId(phone.id);
    setSelectedNetwork((phone.network_provider as NetworkProvider) || "MTN");
    setUseManualInput(false);
    setSelectedPlan(null);
  }, []);

  const handleManualPhoneChange = useCallback((value: string) => {
    // Only allow digits and limit length
    const cleaned = value.replace(/\D/g, '').slice(0, 11);
    setPhoneNumber(cleaned);
    setSelectedPhoneId(null);
    setUseManualInput(true);
  }, []);

  const getPurchaseAmount = (): number => {
    if (purchaseType === "airtime" && customAmount) {
      const amount = parseInt(customAmount, 10);
      return isNaN(amount) ? 0 : Math.ceil(amount * 1.05); // Apply 5% margin
    }
    return selectedPlan?.finalPrice || 0;
  };

  const getRawAmount = (): number => {
    if (purchaseType === "airtime" && customAmount) {
      return parseInt(customAmount, 10) || 0;
    }
    if (selectedPlan && 'amount' in selectedPlan) {
      return selectedPlan.amount;
    }
    return selectedPlan?.finalPrice || 0;
  };

  const purchaseAmount = getPurchaseAmount();
  const amountValidation = validatePurchaseAmount(purchaseAmount, balance, purchaseType);
  
  // Determine current step
  const getCurrentStep = () => {
    if (!isPhoneValid) return 1;
    if (purchaseAmount <= 0) return 2;
    return 3;
  };
  const currentStep = getCurrentStep();

  const canPurchase = isPhoneValid && purchaseAmount > 0 && amountValidation.valid;

  const handlePurchase = async () => {
    if (!canPurchase) return;
    
    setShowConfirmation(false);
    setIsProcessing(true);
    
    const planId = selectedPlan?.id;
    
    const { error } = await purchaseAirtimeOrData(
      purchaseType,
      purchaseAmount,
      phoneNumber,
      selectedPhoneId,
      selectedNetwork,
      planId
    );
    
    setIsProcessing(false);

    if (!error) {
      setSelectedPlan(null);
      setCustomAmount("");
      onBack();
    }
  };

  const handlePurchaseClick = () => {
    setShowConfirmation(true);
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
            disabled={isProcessing}
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Buy {purchaseType === "airtime" ? "Airtime" : "Data"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Balance: {formatCurrency(balance)}
            </p>
          </div>
        </div>
      </motion.header>

      {/* Progress Steps */}
      <div className="px-5 py-4 border-b border-border/30">
        <div className="flex items-center justify-between">
          <StepIndicator step={1} currentStep={currentStep} label="Phone" />
          <div className="flex-1 h-px bg-border mx-2" />
          <StepIndicator step={2} currentStep={currentStep} label="Plan" />
          <div className="flex-1 h-px bg-border mx-2" />
          <StepIndicator step={3} currentStep={currentStep} label="Confirm" />
        </div>
      </div>

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
            disabled={isProcessing}
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
            disabled={isProcessing}
          >
            <Wifi className="w-4 h-4" />
            Data
          </Button>
        </div>

        {/* Instructions */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {currentStep === 1 && "Step 1: Select or enter a phone number to recharge"}
            {currentStep === 2 && `Step 2: Choose ${purchaseType === "airtime" ? "an airtime amount" : "a data plan"}`}
            {currentStep === 3 && "Step 3: Review and confirm your purchase"}
          </AlertDescription>
        </Alert>

        {/* Phone Number Selection */}
        <Card variant="gradient" className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">Phone Number</h3>
          </div>
          
          {/* Saved Numbers */}
          {allPhoneNumbers.length > 0 && !useManualInput && (
            <div className="flex flex-wrap gap-2">
              {allPhoneNumbers.map((phone) => (
                <button
                  key={phone.id || "primary"}
                  onClick={() => handlePhoneSelect(phone)}
                  disabled={isProcessing}
                  className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                    phoneNumber === phone.phone_number && !useManualInput
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/50 text-foreground hover:border-primary/50"
                  }`}
                >
                  <div className="font-medium">{formatPhoneNumber(phone.phone_number)}</div>
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
                disabled={isProcessing}
                className="px-3 py-2 rounded-lg text-sm border border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-foreground transition-all"
              >
                + Other
              </button>
            </div>
          )}

          {/* Manual Input */}
          {(useManualInput || allPhoneNumbers.length === 0) && (
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type="tel"
                  placeholder="e.g. 08012345678"
                  value={phoneNumber}
                  onChange={(e) => handleManualPhoneChange(e.target.value)}
                  className={`bg-secondary/50 pr-20 ${
                    phoneNumber && !phoneValidation.valid ? "border-destructive" : ""
                  }`}
                  disabled={isProcessing}
                  maxLength={11}
                />
                {phoneNumber && phoneValidation.valid && phoneValidation.detectedNetwork && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                    {phoneValidation.detectedNetwork}
                  </span>
                )}
              </div>
              
              <AnimatePresence mode="wait">
                {phoneNumber && (
                  <ValidationMessage
                    isValid={phoneValidation.valid}
                    error={phoneValidation.error}
                    success={`Valid ${phoneValidation.detectedNetwork || ""} number`}
                  />
                )}
              </AnimatePresence>

              {allPhoneNumbers.length > 0 && (
                <button
                  onClick={() => {
                    setUseManualInput(false);
                    setPhoneNumber("");
                  }}
                  disabled={isProcessing}
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
                  disabled={isProcessing}
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
            {useManualInput && phoneValidation.valid && phoneValidation.detectedNetwork && (
              <p className="text-xs text-muted-foreground">
                Auto-detected from phone number
              </p>
            )}
          </Card>
        )}

        {/* Airtime Plans */}
        <AnimatePresence mode="wait">
          {purchaseType === "airtime" && isPhoneValid && (
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
                        disabled={insufficientBalance || isProcessing}
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
                        <div className="text-lg font-bold text-foreground">
                          {formatCurrency(plan.amount)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Pay {formatCurrency(plan.finalPrice)}
                        </div>
                        {plan.cashback && (
                          <div className="text-xs text-primary mt-1">
                            +₦{plan.cashback} bonus
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Card>

              {/* Custom Amount */}
              <Card variant="gradient" className="p-4 space-y-3">
                <h3 className="text-sm font-medium text-foreground">Or Enter Custom Amount</h3>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={customAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Validate numeric input
                      if (value === "" || /^\d+$/.test(value)) {
                        setCustomAmount(value);
                        setSelectedPlan(null);
                      }
                    }}
                    className="bg-secondary/50 pl-8"
                    disabled={isProcessing}
                    min={PAYMENT_LIMITS.MIN_PURCHASE_AMOUNT}
                    max={50000}
                  />
                </div>
                {customAmount && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      You'll pay: <span className="text-foreground font-medium">{formatCurrency(getPurchaseAmount())}</span>
                      <span className="text-xs ml-1">(includes 5% service fee)</span>
                    </p>
                    {parseInt(customAmount) < PAYMENT_LIMITS.MIN_PURCHASE_AMOUNT && (
                      <p className="text-xs text-destructive">
                        Minimum amount is {formatCurrency(PAYMENT_LIMITS.MIN_PURCHASE_AMOUNT)}
                      </p>
                    )}
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          {/* Data Plans */}
          {purchaseType === "data" && isPhoneValid && (
            <motion.div
              key="data"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <Card variant="gradient" className="p-4 space-y-3">
                <h3 className="text-sm font-medium text-foreground">
                  Select Plan for {selectedNetwork}
                </h3>
                
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
                                disabled={insufficientBalance || isProcessing}
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
                                <div className="text-lg font-bold text-foreground">
                                  {plan.dataAmount}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {plan.validity}
                                </div>
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

        {/* Placeholder when phone not valid */}
        {!isPhoneValid && (
          <Card variant="gradient" className="p-6 text-center">
            <Phone className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              Enter a valid phone number to see available {purchaseType === "airtime" ? "amounts" : "plans"}
            </p>
          </Card>
        )}

        {/* Purchase Summary */}
        {purchaseAmount > 0 && isPhoneValid && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card variant="gradient" className="p-4 space-y-4">
              <h3 className="font-medium text-foreground">Purchase Summary</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone Number</span>
                  <span className="text-foreground font-medium">
                    {formatPhoneNumber(phoneValidation.cleanedNumber)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network</span>
                  <span className="text-foreground">{selectedNetwork}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="text-foreground capitalize">{purchaseType}</span>
                </div>
                {purchaseType === "data" && selectedPlan && 'dataAmount' in selectedPlan && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="text-foreground">
                      {selectedPlan.dataAmount} ({selectedPlan.validity})
                    </span>
                  </div>
                )}
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="text-foreground font-medium">Total</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(purchaseAmount)}
                  </span>
                </div>
              </div>
              
              {!amountValidation.valid && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{amountValidation.error}</AlertDescription>
                </Alert>
              )}

              <Button
                className="w-full"
                size="lg"
                disabled={!canPurchase || isProcessing}
                onClick={handlePurchaseClick}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Buy ${purchaseType === "airtime" ? "Airtime" : "Data"}`
                )}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                By proceeding, you agree to our terms and conditions
              </p>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowConfirmation(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-background rounded-t-2xl sm:rounded-2xl p-6 space-y-4"
            >
              <h2 className="text-lg font-bold text-foreground">Confirm Purchase</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Send to</span>
                  <span className="font-medium">{formatPhoneNumber(phoneValidation.cleanedNumber)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Network</span>
                  <span className="font-medium">{selectedNetwork}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-primary">{formatCurrency(purchaseAmount)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Balance After</span>
                  <span className="font-medium">{formatCurrency(balance - purchaseAmount)}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowConfirmation(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handlePurchase}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Confirm"
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
