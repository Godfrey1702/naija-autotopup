import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Phone, ChevronDown, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const nigerianPhoneSchema = z
  .string()
  .regex(/^(070|080|081|090|091)\d{8}$/, "Please enter a valid Nigerian phone number");

const networks = [
  { name: "MTN", prefix: ["0703", "0706", "0803", "0806", "0810", "0813", "0814", "0816", "0903", "0906", "0913", "0916"], color: "#FFCC00" },
  { name: "Airtel", prefix: ["0701", "0708", "0802", "0808", "0812", "0901", "0902", "0904", "0907", "0912"], color: "#FF0000" },
  { name: "Glo", prefix: ["0705", "0805", "0807", "0811", "0815", "0905", "0915"], color: "#00A551" },
  { name: "9mobile", prefix: ["0809", "0817", "0818", "0908", "0909"], color: "#006B53" },
];

const detectNetwork = (phone: string): string | null => {
  if (phone.length < 4) return null;
  const prefix = phone.slice(0, 4);
  for (const network of networks) {
    if (network.prefix.includes(prefix)) {
      return network.name;
    }
  }
  return null;
};

interface PhoneVerificationProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const PhoneVerification = ({ onComplete, onSkip }: PhoneVerificationProps) => {
  const [phone, setPhone] = useState("");
  const [detectedNetwork, setDetectedNetwork] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);

  const { updateProfile } = useAuth();
  const { toast } = useToast();

  const handlePhoneChange = (value: string) => {
    // Only allow numbers and limit to 11 digits
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    setPhone(cleaned);
    setDetectedNetwork(detectNetwork(cleaned));
    setError(null);
  };

  const handleSubmit = async () => {
    const result = nigerianPhoneSchema.safeParse(phone);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    if (!consentGiven) {
      toast({
        title: "Consent required",
        description: "Please agree to the terms to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await updateProfile({
        phone_number: phone,
        network_provider: detectedNetwork,
        phone_verified: true, // For demo; in production, verify via OTP
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to save phone number. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Phone number verified!",
          description: `Your ${detectedNetwork || "phone"} number has been linked.`,
        });
        onComplete();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const networkColor = detectedNetwork
    ? networks.find((n) => n.name === detectedNetwork)?.color
    : undefined;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-xl font-bold text-foreground">Link Your Phone</h1>
        </div>
        <p className="text-muted-foreground">
          Add your Nigerian phone number to enable automatic top-ups.
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4">
        <Card className="border-border/50">
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="08012345678"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="pl-11 pr-24 text-lg h-14"
                  disabled={isLoading}
                />
                {detectedNetwork && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 rounded-full text-sm font-semibold"
                    style={{ backgroundColor: networkColor, color: detectedNetwork === "MTN" ? "#000" : "#fff" }}
                  >
                    {detectedNetwork}
                  </motion.div>
                )}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            {/* Network indicator */}
            {phone.length >= 4 && !detectedNetwork && (
              <p className="text-sm text-muted-foreground">
                We couldn't detect your network. Please check the number.
              </p>
            )}

            {/* Consent checkbox */}
            <div className="flex items-start gap-3 p-4 bg-secondary/50 rounded-xl">
              <button
                type="button"
                onClick={() => setConsentGiven(!consentGiven)}
                className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                  consentGiven
                    ? "bg-primary border-primary"
                    : "border-muted-foreground"
                }`}
              >
                {consentGiven && <Check className="w-4 h-4 text-primary-foreground" />}
              </button>
              <p className="text-sm text-muted-foreground">
                I consent to AutoTopUp monitoring my data/airtime balance and automatically topping up
                when it falls below my set thresholds. I understand this is required for the service to
                work.
              </p>
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full h-12 text-base font-semibold"
              disabled={isLoading || phone.length < 11 || !consentGiven}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Continue"
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={onSkip}
              className="w-full text-muted-foreground"
              disabled={isLoading}
            >
              Skip for now
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
