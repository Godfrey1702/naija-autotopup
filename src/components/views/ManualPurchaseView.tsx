import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { ChevronLeft, Smartphone, Wifi, Phone, Lock, Loader2, Info, Signal, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWallet } from "@/contexts/WalletContext";
import { usePhoneNumbers } from "@/contexts/PhoneNumberContext";
import { TransactionReceipt } from "@/components/receipt/TransactionReceipt";
import { DATA_PLANS, formatCurrency, PRICING_MARGIN, AIRTIME_PRESETS, NETWORK_PROVIDERS, NetworkProvider, DataPlan } from "@/lib/constants";

interface ManualPurchaseViewProps {
  onBack: () => void;
  initialType?: "airtime" | "data";
}

interface ReceiptData {
  type: "airtime" | "data";
  amount: number;
  phoneNumber: string;
  reference: string;
  date: Date;
  networkProvider?: string;
  planDetails?: string;
}

export function ManualPurchaseView({ onBack, initialType = "airtime" }: ManualPurchaseViewProps) {
  const { wallet, purchaseAirtimeOrData } = useWallet();
  const { allPhoneNumbers } = usePhoneNumbers();
  
  const [purchaseType, setPurchaseType] = useState<"airtime" | "data">(initialType);
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>("primary");
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkProvider>("MTN");
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const selectedPhone = allPhoneNumbers.find(
    p => (p.id || "primary") === selectedPhoneId
  );

  // Auto-select network from phone if available
  useEffect(() => {
    if (selectedPhone?.network_provider) {
      const provider = selectedPhone.network_provider as NetworkProvider;
      if (NETWORK_PROVIDERS.includes(provider)) {
        setSelectedNetwork(provider);
      }
    }
  }, [selectedPhone]);

  const finalAmount = customAmount ? Number(customAmount) : (selectedPlan?.finalPrice || amount);

  // Get selected data plan label
  const getDataPlanLabel = () => {
    if (purchaseType !== "data" || !selectedPlan) return undefined;
    return `${selectedPlan.dataAmount} - ${selectedPlan.validity}`;
  };

  const handleConfirmPurchase = () => {
    if (!finalAmount || finalAmount <= 0) return;
    if (!selectedPhone) return;
    setShowConfirmation(true);
  };

  const handlePurchase = async () => {
    if (!finalAmount || finalAmount <= 0) return;
    if (!selectedPhone) return;
    
    setShowConfirmation(false);
    setIsLoading(true);
    const { error } = await purchaseAirtimeOrData(
      purchaseType,
      finalAmount,
      selectedPhone.phone_number,
      selectedPhoneId === "primary" ? null : selectedPhoneId
    );
    setIsLoading(false);

    if (!error) {
      setReceiptData({
        type: purchaseType,
        amount: finalAmount,
        phoneNumber: selectedPhone.phone_number,
        reference: `${purchaseType.toUpperCase()}-${Date.now()}`,
        date: new Date(),
        networkProvider: purchaseType === "data" ? selectedNetwork : (selectedPhone.network_provider || undefined),
        planDetails: getDataPlanLabel(),
      });
    }
  };

  const handleReceiptClose = () => {
    setReceiptData(null);
    setAmount(0);
    setCustomAmount("");
    setSelectedPlan(null);
    onBack();
  };

  const canPurchase = finalAmount > 0 && (wallet?.balance || 0) >= finalAmount;
  const currentDataPlans = DATA_PLANS[selectedNetwork];

  // Show receipt after successful purchase
  if (receiptData) {
    return (
      <TransactionReceipt
        type={receiptData.type}
        amount={receiptData.amount}
        phoneNumber={receiptData.phoneNumber}
        reference={receiptData.reference}
        date={receiptData.date}
        status="completed"
        networkProvider={receiptData.networkProvider}
        planDetails={receiptData.planDetails}
        onClose={handleReceiptClose}
      />
    );
  }

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
            <p className="text-sm text-muted-foreground">One-time purchase</p>
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <div className="px-5 py-6 space-y-6">
        {/* Type Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <label className="text-sm font-medium text-foreground mb-3 block">
            What would you like to buy?
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Card
              variant="gradient"
              className={`p-4 cursor-pointer text-center transition-all ${
                purchaseType === "airtime" ? "border-primary ring-2 ring-primary/30" : ""
              }`}
              onClick={() => {
                setPurchaseType("airtime");
                setAmount(0);
                setCustomAmount("");
                setSelectedPlan(null);
              }}
            >
              <Smartphone className={`w-8 h-8 mx-auto mb-2 ${purchaseType === "airtime" ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium">Airtime</span>
            </Card>
            <Card
              variant="gradient"
              className={`p-4 cursor-pointer text-center transition-all ${
                purchaseType === "data" ? "border-accent ring-2 ring-accent/30" : ""
              }`}
              onClick={() => {
                setPurchaseType("data");
                setAmount(0);
                setCustomAmount("");
                setSelectedPlan(null);
              }}
            >
              <Wifi className={`w-8 h-8 mx-auto mb-2 ${purchaseType === "data" ? "text-accent" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium">Data</span>
            </Card>
          </div>
        </motion.div>

        {/* Phone Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <label className="text-sm font-medium text-foreground mb-3 block">
            Select Phone Number
          </label>
          <Select value={selectedPhoneId} onValueChange={setSelectedPhoneId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select phone number" />
            </SelectTrigger>
            <SelectContent>
              {allPhoneNumbers.map((phone) => (
                <SelectItem key={phone.id || "primary"} value={phone.id || "primary"}>
                  <div className="flex items-center gap-2">
                    {phone.is_primary && <Lock className="w-3 h-3 text-primary" />}
                    <Phone className="w-3 h-3 text-muted-foreground" />
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
          {selectedPhone && (
            <p className="text-xs text-muted-foreground mt-2">
              {selectedPhone.is_primary 
                ? "Primary account number - default for all purchases" 
                : selectedPhone.label || "Additional number"}
            </p>
          )}
        </motion.div>

        {/* Network Selection for Data */}
        {purchaseType === "data" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
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
                  onClick={() => {
                    setSelectedNetwork(network);
                    setSelectedPlan(null);
                    setAmount(0);
                  }}
                >
                  <Signal className={`w-5 h-5 mx-auto mb-1 ${selectedNetwork === network ? "text-accent" : "text-muted-foreground"}`} />
                  <span className="text-xs font-medium">{network}</span>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Amount/Plan Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: purchaseType === "data" ? 0.3 : 0.2 }}
        >
          <label className="text-sm font-medium text-foreground mb-3 block">
            {purchaseType === "airtime" ? "Select Amount" : "Select Data Plan"}
          </label>
          
          {purchaseType === "airtime" ? (
            <>
              {/* Wallet Balance Display */}
              <Card variant="gradient" className="p-3 mb-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Wallet Balance</span>
                <span className="text-lg font-semibold text-primary">{formatCurrency(wallet?.balance || 0)}</span>
              </Card>
              
              <div className="grid grid-cols-3 gap-3 mb-4">
                {AIRTIME_PRESETS.map((amt) => (
                  <Card
                    key={amt}
                    variant="gradient"
                    className={`p-4 cursor-pointer text-center transition-all ${
                      amount === amt && !customAmount ? "border-primary ring-2 ring-primary/30" : ""
                    } ${(wallet?.balance || 0) < amt ? "opacity-50" : ""}`}
                    onClick={() => {
                      if ((wallet?.balance || 0) >= amt) {
                        setAmount(amt);
                        setCustomAmount("");
                      }
                    }}
                  >
                    <span className="text-lg font-bold">{formatCurrency(amt)}</span>
                    {(wallet?.balance || 0) < amt && (
                      <p className="text-xs text-destructive mt-1">Insufficient</p>
                    )}
                  </Card>
                ))}
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Or enter custom amount</label>
                <Input
                  type="number"
                  placeholder="Enter amount (e.g., 1500)"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setAmount(0);
                  }}
                  className="text-lg"
                />
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <TooltipProvider>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-muted-foreground">Prices include {PRICING_MARGIN * 100}% service fee</span>
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
              
              {currentDataPlans.map((plan) => (
                <Card
                  key={plan.id}
                  variant="gradient"
                  className={`p-4 cursor-pointer transition-all ${
                    selectedPlan?.id === plan.id ? "border-accent ring-2 ring-accent/30" : ""
                  } ${(wallet?.balance || 0) < plan.finalPrice ? "opacity-50" : ""}`}
                  onClick={() => {
                    if ((wallet?.balance || 0) >= plan.finalPrice) {
                      setSelectedPlan(plan);
                      setAmount(plan.finalPrice);
                      setCustomAmount("");
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {selectedPlan?.id === plan.id && (
                        <CheckCircle2 className="w-5 h-5 text-accent" />
                      )}
                      <div>
                        <span className="font-semibold text-lg">{plan.dataAmount}</span>
                        <p className="text-xs text-muted-foreground">{plan.validity}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-accent font-bold text-lg">{formatCurrency(plan.finalPrice)}</span>
                      {(wallet?.balance || 0) < plan.finalPrice && (
                        <p className="text-xs text-destructive">Insufficient</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </motion.div>

        {/* Summary */}
        {finalAmount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card variant="gradient" className="p-4 border-primary/30">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">₦{finalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium">{selectedPhone?.phone_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Wallet Balance</span>
                  <span className={`font-medium ${(wallet?.balance || 0) < finalAmount ? "text-destructive" : "text-primary"}`}>
                    ₦{(wallet?.balance || 0).toLocaleString()}
                  </span>
                </div>
                {(wallet?.balance || 0) < finalAmount && (
                  <p className="text-xs text-destructive">Insufficient wallet balance</p>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Purchase Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: purchaseType === "data" ? 0.4 : 0.3 }}
        >
          <Button
            onClick={handleConfirmPurchase}
            disabled={!canPurchase || isLoading}
            className="w-full h-14 text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Buy ${purchaseType === "airtime" ? "Airtime" : "Data"} - ${formatCurrency(finalAmount)}`
            )}
          </Button>
        </motion.div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>You are about to purchase:</p>
                <div className="bg-secondary p-3 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium text-foreground capitalize">{purchaseType}</span>
                  </div>
                  {purchaseType === "data" && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Network</span>
                        <span className="font-medium text-foreground">{selectedNetwork}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Plan</span>
                        <span className="font-medium text-foreground">{selectedPlan?.dataAmount} - {selectedPlan?.validity}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-medium text-foreground">{formatCurrency(finalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="font-medium text-foreground">{selectedPhone?.phone_number}</span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePurchase}>
              Confirm Purchase
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
