import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronLeft, Smartphone, Wifi, Phone, Lock, CheckCircle, Loader2 } from "lucide-react";
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
import { useWallet } from "@/contexts/WalletContext";
import { usePhoneNumbers } from "@/contexts/PhoneNumberContext";

interface ManualPurchaseViewProps {
  onBack: () => void;
  initialType?: "airtime" | "data";
}

const AIRTIME_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];
const DATA_PLANS = [
  { amount: 300, label: "500MB - 1 Day" },
  { amount: 500, label: "1GB - 1 Day" },
  { amount: 1000, label: "2GB - 7 Days" },
  { amount: 1500, label: "3GB - 30 Days" },
  { amount: 2000, label: "5GB - 30 Days" },
  { amount: 3000, label: "10GB - 30 Days" },
];

export function ManualPurchaseView({ onBack, initialType = "airtime" }: ManualPurchaseViewProps) {
  const { wallet, purchaseAirtimeOrData } = useWallet();
  const { allPhoneNumbers } = usePhoneNumbers();
  
  const [purchaseType, setPurchaseType] = useState<"airtime" | "data">(initialType);
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>("primary");
  const [amount, setAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const selectedPhone = allPhoneNumbers.find(
    p => (p.id || "primary") === selectedPhoneId
  );

  const finalAmount = customAmount ? Number(customAmount) : amount;

  const handlePurchase = async () => {
    if (!finalAmount || finalAmount <= 0) return;
    if (!selectedPhone) return;
    
    setIsLoading(true);
    const { error } = await purchaseAirtimeOrData(
      purchaseType,
      finalAmount,
      selectedPhone.phone_number,
      selectedPhoneId === "primary" ? null : selectedPhoneId
    );
    setIsLoading(false);

    if (!error) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setAmount(0);
        setCustomAmount("");
      }, 2000);
    }
  };

  const canPurchase = finalAmount > 0 && (wallet?.balance || 0) >= finalAmount;

  if (success) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-5">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Purchase Successful!</h2>
          <p className="text-muted-foreground">
            ₦{finalAmount.toLocaleString()} {purchaseType} sent to {selectedPhone?.phone_number}
          </p>
        </motion.div>
      </div>
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

        {/* Amount Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <label className="text-sm font-medium text-foreground mb-3 block">
            {purchaseType === "airtime" ? "Select Amount" : "Select Data Plan"}
          </label>
          
          {purchaseType === "airtime" ? (
            <>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {AIRTIME_AMOUNTS.map((amt) => (
                  <Card
                    key={amt}
                    variant="gradient"
                    className={`p-3 cursor-pointer text-center transition-all ${
                      amount === amt && !customAmount ? "border-primary ring-2 ring-primary/30" : ""
                    }`}
                    onClick={() => {
                      setAmount(amt);
                      setCustomAmount("");
                    }}
                  >
                    <span className="text-sm font-semibold">₦{amt.toLocaleString()}</span>
                  </Card>
                ))}
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Or enter custom amount</label>
                <Input
                  type="number"
                  placeholder="Enter amount"
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
            <div className="space-y-2">
              {DATA_PLANS.map((plan) => (
                <Card
                  key={plan.amount}
                  variant="gradient"
                  className={`p-4 cursor-pointer transition-all ${
                    amount === plan.amount ? "border-accent ring-2 ring-accent/30" : ""
                  }`}
                  onClick={() => {
                    setAmount(plan.amount);
                    setCustomAmount("");
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{plan.label}</span>
                    <span className="text-accent font-semibold">₦{plan.amount.toLocaleString()}</span>
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
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={handlePurchase}
            disabled={!canPurchase || isLoading}
            className="w-full h-14 text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Buy ${purchaseType === "airtime" ? "Airtime" : "Data"} - ₦${finalAmount.toLocaleString()}`
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
