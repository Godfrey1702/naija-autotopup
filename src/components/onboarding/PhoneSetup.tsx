import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronLeft, Smartphone, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface PhoneSetupProps {
  onBack: () => void;
  onComplete: (phone: string, network: string) => void;
}

const networks = [
  { id: "mtn", name: "MTN", color: "bg-yellow-500" },
  { id: "glo", name: "Glo", color: "bg-green-500" },
  { id: "airtel", name: "Airtel", color: "bg-red-500" },
  { id: "9mobile", name: "9mobile", color: "bg-green-600" },
];

export function PhoneSetup({ onBack, onComplete }: PhoneSetupProps) {
  const [phone, setPhone] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [consent, setConsent] = useState(false);

  const isValid = phone.length === 11 && selectedNetwork && consent;

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    setPhone(cleaned);

    // Auto-detect network
    if (cleaned.startsWith("080") || cleaned.startsWith("081") || cleaned.startsWith("090") || cleaned.startsWith("070")) {
      if (cleaned.startsWith("0803") || cleaned.startsWith("0806") || cleaned.startsWith("0813") || cleaned.startsWith("0816") || cleaned.startsWith("0810") || cleaned.startsWith("0814") || cleaned.startsWith("0903") || cleaned.startsWith("0906") || cleaned.startsWith("0913") || cleaned.startsWith("0916") || cleaned.startsWith("0703") || cleaned.startsWith("0706")) {
        setSelectedNetwork("mtn");
      } else if (cleaned.startsWith("0805") || cleaned.startsWith("0807") || cleaned.startsWith("0811") || cleaned.startsWith("0815") || cleaned.startsWith("0905") || cleaned.startsWith("0915") || cleaned.startsWith("0705")) {
        setSelectedNetwork("glo");
      } else if (cleaned.startsWith("0802") || cleaned.startsWith("0808") || cleaned.startsWith("0812") || cleaned.startsWith("0701") || cleaned.startsWith("0902") || cleaned.startsWith("0901") || cleaned.startsWith("0912") || cleaned.startsWith("0907")) {
        setSelectedNetwork("airtel");
      } else if (cleaned.startsWith("0809") || cleaned.startsWith("0817") || cleaned.startsWith("0818") || cleaned.startsWith("0909") || cleaned.startsWith("0908")) {
        setSelectedNetwork("9mobile");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col gradient-hero px-6 py-8">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-8"
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Smartphone className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Link Your Phone</h2>
        <p className="text-muted-foreground">
          Enter your phone number to monitor and auto top-up
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex-1 space-y-6"
      >
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Phone Number
          </label>
          <Input
            type="tel"
            placeholder="08012345678"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            className="h-14 text-lg"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">
            Select Network
          </label>
          <div className="grid grid-cols-4 gap-2">
            {networks.map((network) => (
              <Card
                key={network.id}
                variant="gradient"
                className={`p-3 cursor-pointer transition-all duration-300 ${
                  selectedNetwork === network.id
                    ? "border-primary ring-2 ring-primary/30"
                    : "hover:border-primary/50"
                }`}
                onClick={() => setSelectedNetwork(network.id)}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full ${network.color}`} />
                  <span className="text-xs font-medium text-foreground">{network.name}</span>
                </div>
                {selectedNetwork === network.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                  >
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </motion.div>
                )}
              </Card>
            ))}
          </div>
        </div>

        <Card variant="gradient" className="p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-border accent-primary"
            />
            <span className="text-sm text-muted-foreground">
              I consent to AutoTopUp monitoring my airtime and data balance, and automatically topping up when thresholds are reached.
            </span>
          </label>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-6"
      >
        <Button
          onClick={() => onComplete(phone, selectedNetwork)}
          disabled={!isValid}
          size="xl"
          className="w-full"
        >
          Continue
        </Button>
      </motion.div>
    </div>
  );
}
