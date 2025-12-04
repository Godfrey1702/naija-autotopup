import { motion } from "framer-motion";
import { Eye, EyeOff, Plus, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface WalletCardProps {
  balance: number;
  onAddFunds: () => void;
}

export function WalletCard({ balance, onAddFunds }: WalletCardProps) {
  const [showBalance, setShowBalance] = useState(true);

  const formattedBalance = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(balance);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl gradient-primary p-6 shadow-glow"
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-foreground/10 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-foreground/10 translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-primary-foreground/70 text-sm font-medium">Wallet Balance</p>
            <div className="flex items-center gap-2 mt-1">
              <motion.h2
                key={showBalance ? "visible" : "hidden"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-3xl font-bold text-primary-foreground"
              >
                {showBalance ? formattedBalance : "₦••••••"}
              </motion.h2>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="p-1 rounded-full hover:bg-primary-foreground/10 transition-colors"
              >
                {showBalance ? (
                  <Eye className="w-4 h-4 text-primary-foreground/70" />
                ) : (
                  <EyeOff className="w-4 h-4 text-primary-foreground/70" />
                )}
              </button>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
            <ArrowUpRight className="w-6 h-6 text-primary-foreground" />
          </div>
        </div>

        <Button
          onClick={onAddFunds}
          variant="glass"
          className="w-full bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/30"
        >
          <Plus className="w-4 h-4" />
          Add Funds
        </Button>
      </div>
    </motion.div>
  );
}
