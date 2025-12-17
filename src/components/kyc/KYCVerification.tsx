import { motion } from "framer-motion";
import { useState } from "react";
import { Shield, CheckCircle, AlertCircle, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface KYCVerificationProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function KYCVerification({ onComplete, onSkip }: KYCVerificationProps) {
  const { submitKYC, profile } = useAuth();
  const { toast } = useToast();
  const [ninNumber, setNinNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NIN validation - Nigerian NIN is 11 digits
  const isValidNIN = (nin: string) => {
    const cleanNIN = nin.replace(/\s/g, "");
    return /^\d{11}$/.test(cleanNIN);
  };

  const formatNIN = (value: string) => {
    // Remove non-digits and limit to 11 characters
    const digits = value.replace(/\D/g, "").slice(0, 11);
    // Format as XXX-XXXX-XXXX
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const handleNINChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNIN(e.target.value);
    setNinNumber(formatted);
    setError(null);
  };

  const handleSubmit = async () => {
    const cleanNIN = ninNumber.replace(/\D/g, "");
    
    if (!isValidNIN(cleanNIN)) {
      setError("Please enter a valid 11-digit NIN number");
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error: submitError } = await submitKYC(cleanNIN);
    setIsLoading(false);

    if (submitError) {
      setError(submitError.message);
      toast({
        title: "Verification Failed",
        description: submitError.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "KYC Submitted",
        description: "Your NIN has been submitted for verification",
      });
      onComplete();
    }
  };

  // If already verified, show success
  if (profile?.kyc_status === "verified") {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-5">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">KYC Verified</h2>
          <p className="text-muted-foreground mb-6">
            Your identity has been verified successfully
          </p>
          <Button onClick={onComplete} className="w-full">
            Continue
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-5 py-6 text-center"
      >
        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Verify Your Identity</h1>
        <p className="text-muted-foreground">
          Complete KYC verification to access all features
        </p>
      </motion.header>

      {/* Content */}
      <div className="flex-1 px-5 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Info Card */}
          <Card variant="gradient" className="p-4 mb-6 border-primary/30">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-foreground text-sm mb-1">Why we need your NIN</h3>
                <p className="text-xs text-muted-foreground">
                  To comply with Nigerian financial regulations and prevent fraud, we require NIN verification. 
                  Your information is encrypted and securely stored.
                </p>
              </div>
            </div>
          </Card>

          {/* NIN Input */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                National Identification Number (NIN)
              </label>
              <Input
                type="text"
                placeholder="XXX-XXXX-XXXX"
                value={ninNumber}
                onChange={handleNINChange}
                className={`h-14 text-lg text-center tracking-widest ${error ? "border-destructive" : ""}`}
                maxLength={13}
              />
              {error && (
                <p className="text-sm text-destructive mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Enter your 11-digit NIN number
              </p>
            </div>

            {/* Benefits */}
            <Card variant="gradient" className="p-4">
              <h4 className="font-medium text-foreground text-sm mb-3">After verification, you can:</h4>
              <ul className="space-y-2">
                {[
                  "Top up your wallet up to ₦8,000,000",
                  "Make unlimited airtime & data purchases",
                  "Set up automatic top-up rules",
                  "Access premium features",
                ].map((benefit, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </motion.div>
      </div>

      {/* Footer Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="px-5 pb-8 space-y-3"
      >
        <Button
          onClick={handleSubmit}
          disabled={!isValidNIN(ninNumber.replace(/\D/g, "")) || isLoading}
          className="w-full h-14"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify NIN"
          )}
        </Button>
        
        {onSkip && (
          <Button
            variant="ghost"
            onClick={onSkip}
            className="w-full text-muted-foreground"
          >
            Skip for now
          </Button>
        )}
        
        <p className="text-xs text-center text-muted-foreground">
          By continuing, you agree to our KYC verification process and consent to the use of your NIN for identity verification.
        </p>
      </motion.div>
    </div>
  );
}
