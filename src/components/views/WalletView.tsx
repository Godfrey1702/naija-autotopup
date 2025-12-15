import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronLeft, Plus, ArrowDownLeft, ArrowUpRight, CreditCard, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useWallet } from "@/contexts/WalletContext";
import { formatDistanceToNow } from "date-fns";

interface WalletViewProps {
  onBack: () => void;
}

const quickAmounts = [500, 1000, 2000, 5000, 10000];

export function WalletView({ onBack }: WalletViewProps) {
  const { wallet, transactions, fundWallet } = useWallet();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const balance = wallet?.balance || 0;

  const handleFund = async () => {
    const amount = Number(fundAmount);
    if (amount < 100) return;

    setIsLoading(true);
    const { error } = await fundWallet(amount);
    setIsLoading(false);

    if (!error) {
      setIsDialogOpen(false);
      setFundAmount("");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `Today, ${date.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit", hour12: true })}`;
    } else if (diffDays === 1) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" });
    }
  };

  const getTransactionDisplay = (tx: typeof transactions[0]) => {
    const isCredit = tx.type === "deposit";
    return {
      isCredit,
      icon: isCredit ? ArrowDownLeft : ArrowUpRight,
      description: tx.description || tx.type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    };
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
            <h1 className="text-xl font-bold text-foreground">Wallet</h1>
            <p className="text-sm text-muted-foreground">Manage your funds</p>
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <div className="px-5 py-6 space-y-6">
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 gradient-primary overflow-hidden relative">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-foreground/10 -translate-y-1/2 translate-x-1/2" />
            </div>
            <div className="relative z-10">
              <p className="text-primary-foreground/70 text-sm font-medium mb-1">Available Balance</p>
              <h2 className="text-4xl font-bold text-primary-foreground mb-6">
                ₦{balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
              </h2>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="glass"
                    className="w-full bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/30"
                  >
                    <Plus className="w-4 h-4" />
                    Add Funds
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle>Fund Your Wallet</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Amount (₦)
                      </label>
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        value={fundAmount}
                        onChange={(e) => setFundAmount(e.target.value)}
                        className="h-14 text-lg"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Quick Select
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        {quickAmounts.map((amount) => (
                          <button
                            key={amount}
                            onClick={() => setFundAmount(amount.toString())}
                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                              fundAmount === amount.toString()
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-foreground hover:bg-secondary/80"
                            }`}
                          >
                            ₦{amount >= 1000 ? `${amount / 1000}k` : amount}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Payment Method
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <Card variant="gradient" className="p-4 cursor-pointer border-primary ring-2 ring-primary/30">
                          <CreditCard className="w-6 h-6 text-primary mx-auto mb-2" />
                          <span className="text-xs font-medium text-center block">Card Payment</span>
                        </Card>
                        <Card variant="gradient" className="p-4 cursor-pointer hover:border-primary/50">
                          <Building2 className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                          <span className="text-xs font-medium text-center block">Bank Transfer</span>
                        </Card>
                      </div>
                    </div>

                    <Button
                      onClick={handleFund}
                      disabled={!fundAmount || Number(fundAmount) < 100 || isLoading}
                      className="w-full"
                    >
                      {isLoading ? "Processing..." : `Fund ₦${fundAmount ? Number(fundAmount).toLocaleString() : "0"}`}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Card>
        </motion.div>

        {/* Transaction History */}
        <div>
          <h3 className="font-semibold text-foreground mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <Card variant="gradient" className="p-8 text-center">
                <p className="text-muted-foreground">No transactions yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Fund your wallet to get started
                </p>
              </Card>
            ) : (
              transactions.slice(0, 10).map((tx, index) => {
                const display = getTransactionDisplay(tx);
                const Icon = display.icon;
                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card variant="gradient" className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            display.isCredit
                              ? "bg-primary/20 text-primary"
                              : "bg-destructive/20 text-destructive"
                          }`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{display.description}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</p>
                          </div>
                        </div>
                        <span className={`font-semibold ${
                          display.isCredit ? "text-primary" : "text-foreground"
                        }`}>
                          {display.isCredit ? "+" : "-"}₦{tx.amount.toLocaleString()}
                        </span>
                      </div>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
