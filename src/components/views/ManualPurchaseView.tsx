import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { ChevronLeft, Smartphone, Wifi, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { AirtimePlanSelector } from "@/components/plans/AirtimePlanSelector";
import { DataPlanSelector } from "@/components/plans/DataPlanSelector";
import { PhoneNumberInput } from "@/components/plans/PhoneNumberInput";
import { 
  formatCurrency, 
  NetworkProvider, 
  DataPlan, 
  AirtimePlan,
  NETWORK_PROVIDERS,
  calculatePriceWithMargin,
} from "@/lib/constants";

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
  const [manualPhoneNumber, setManualPhoneNumber] = useState<string>("");
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkProvider>("MTN");
  const [selectedDataPlan, setSelectedDataPlan] = useState<DataPlan | null>(null);
  const [selectedAirtimePlan, setSelectedAirtimePlan] = useState<AirtimePlan | null>(null);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const selectedPhone = selectedPhoneId === "manual" 
    ? null 
    : allPhoneNumbers.find(p => (p.id || "primary") === selectedPhoneId);

  const phoneNumber = selectedPhoneId === "manual" 
    ? manualPhoneNumber 
    : selectedPhone?.phone_number || "";

  // Auto-select network from phone if available
  useEffect(() => {
    if (selectedPhone?.network_provider) {
      const provider = selectedPhone.network_provider as NetworkProvider;
      if (NETWORK_PROVIDERS.includes(provider)) {
        setSelectedNetwork(provider);
      }
    }
  }, [selectedPhone]);

  // Calculate final amount
  const finalAmount = purchaseType === "data" 
    ? (selectedDataPlan?.finalPrice || 0)
    : customAmount 
      ? calculatePriceWithMargin(Number(customAmount))
      : (selectedAirtimePlan?.finalPrice || 0);

  const getDataPlanLabel = () => {
    if (purchaseType !== "data" || !selectedDataPlan) return undefined;
    return `${selectedDataPlan.dataAmount} - ${selectedDataPlan.validity}`;
  };

  const handleConfirmPurchase = () => {
    if (!finalAmount || finalAmount <= 0) return;
    if (!phoneNumber || (selectedPhoneId === "manual" && manualPhoneNumber.length !== 11)) return;
    setShowConfirmation(true);
  };

  const handlePurchase = async () => {
    if (!finalAmount || finalAmount <= 0) return;
    if (!phoneNumber) return;
    
    setShowConfirmation(false);
    setIsLoading(true);
    const { error } = await purchaseAirtimeOrData(
      purchaseType,
      finalAmount,
      phoneNumber,
      selectedPhoneId === "primary" || selectedPhoneId === "manual" ? null : selectedPhoneId
    );
    setIsLoading(false);

    if (!error) {
      setReceiptData({
        type: purchaseType,
        amount: finalAmount,
        phoneNumber: phoneNumber,
        reference: `${purchaseType.toUpperCase()}-${Date.now()}`,
        date: new Date(),
        networkProvider: purchaseType === "data" ? selectedNetwork : (selectedPhone?.network_provider || undefined),
        planDetails: getDataPlanLabel(),
      });
    }
  };

  const handleReceiptClose = () => {
    setReceiptData(null);
    setCustomAmount("");
    setSelectedDataPlan(null);
    setSelectedAirtimePlan(null);
    onBack();
  };

  const canPurchase = finalAmount > 0 && 
    (wallet?.balance || 0) >= finalAmount && 
    (selectedPhoneId !== "manual" || manualPhoneNumber.length === 11);

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
                setCustomAmount("");
                setSelectedDataPlan(null);
                setSelectedAirtimePlan(null);
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
                setCustomAmount("");
                setSelectedDataPlan(null);
                setSelectedAirtimePlan(null);
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
          <PhoneNumberInput
            phoneNumbers={allPhoneNumbers}
            selectedPhoneId={selectedPhoneId}
            onPhoneSelect={setSelectedPhoneId}
            manualPhoneNumber={manualPhoneNumber}
            onManualPhoneChange={setManualPhoneNumber}
            allowManualEntry={true}
          />
        </motion.div>

        {/* Wallet Balance Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card variant="gradient" className="p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Wallet Balance</span>
            <span className="text-lg font-semibold text-primary">{formatCurrency(wallet?.balance || 0)}</span>
          </Card>
        </motion.div>

        {/* Amount/Plan Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <label className="text-sm font-medium text-foreground mb-3 block">
            {purchaseType === "airtime" ? "Select Airtime Amount" : "Select Data Plan"}
          </label>
          
          {purchaseType === "airtime" ? (
            <AirtimePlanSelector
              selectedPlan={selectedAirtimePlan}
              customAmount={customAmount}
              onSelectPlan={(plan) => {
                setSelectedAirtimePlan(plan);
                setCustomAmount("");
              }}
              onCustomAmountChange={(amount) => {
                setCustomAmount(amount);
                setSelectedAirtimePlan(null);
              }}
              walletBalance={wallet?.balance || 0}
              showCustomInput={true}
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
                  <span className="font-medium">{formatCurrency(finalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium">{phoneNumber || "Not selected"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Wallet Balance</span>
                  <span className={`font-medium ${(wallet?.balance || 0) < finalAmount ? "text-destructive" : "text-primary"}`}>
                    {formatCurrency(wallet?.balance || 0)}
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
          transition={{ delay: 0.3 }}
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
                <p className="text-muted-foreground">
                  You are about to purchase {purchaseType === "airtime" ? "airtime" : "data"} for:
                </p>
                <Card variant="gradient" className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-medium capitalize">{purchaseType}</span>
                    </div>
                    {purchaseType === "data" && selectedDataPlan && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Plan</span>
                        <span className="font-medium">{selectedDataPlan.dataAmount} - {selectedDataPlan.validity}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-medium text-primary">{formatCurrency(finalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone</span>
                      <span className="font-medium">{phoneNumber}</span>
                    </div>
                  </div>
                </Card>
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
