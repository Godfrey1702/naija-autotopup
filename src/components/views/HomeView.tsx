import { motion } from "framer-motion";
import { Bell, User } from "lucide-react";
import { WalletCard } from "@/components/dashboard/WalletCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { UsageOverview } from "@/components/dashboard/UsageOverview";
import { BudgetCard } from "@/components/dashboard/BudgetCard";
import { useWallet } from "@/contexts/WalletContext";
import { useAuth } from "@/contexts/AuthContext";
import { useGreeting } from "@/hooks/useGreeting";

interface HomeViewProps {
  onNavigate: (tab: string) => void;
}

export function HomeView({ onNavigate }: HomeViewProps) {
  const { wallet, transactions } = useWallet();
  const { profile } = useAuth();
  const { greeting } = useGreeting();

  const displayName = profile?.full_name?.split(" ")[0] || "User";

  // Calculate usage stats from transactions
  const monthlyTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.created_at);
    const now = new Date();
    return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
  });

  const dataSpent = monthlyTransactions
    .filter((tx) => tx.type === "data_purchase")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const airtimeSpent = monthlyTransactions
    .filter((tx) => tx.type === "airtime_purchase")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const usageData = [
    { label: "Data Spent", current: dataSpent, previous: 0, unit: "₦", color: "text-accent" },
    { label: "Airtime Spent", current: airtimeSpent, previous: 0, unit: "₦", color: "text-primary" },
    { label: "Total Deposits", current: monthlyTransactions.filter(tx => tx.type === "deposit").reduce((sum, tx) => sum + tx.amount, 0), previous: 0, unit: "₦", color: "text-primary" },
    { label: "Transactions", current: monthlyTransactions.length, previous: 0, unit: "", color: "text-foreground" },
  ];

  return (
    <div className="min-h-screen gradient-hero pb-24">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 glass border-b border-border/50 px-5 py-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{greeting}</p>
            <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center relative">
              <Bell className="w-5 h-5 text-foreground" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
            </button>
            <button className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <div className="px-5 py-6 space-y-6">
        <WalletCard
          balance={wallet?.balance || 0}
          onAddFunds={() => onNavigate("wallet")}
        />

        <QuickActions
          onAction={(action) => {
            if (action === "history") {
              onNavigate("analytics");
            } else if (action === "airtime" || action === "data") {
              onNavigate(action);
            }
          }}
        />

        <UsageOverview data={usageData} />

        <BudgetCard
          totalBudget={10000}
          spent={6850}
          onManage={() => onNavigate("settings")}
        />
      </div>
    </div>
  );
}
