import { motion } from "framer-motion";
import { Bell, User } from "lucide-react";
import { WalletCard } from "@/components/dashboard/WalletCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { AutoTopUpStatus } from "@/components/dashboard/AutoTopUpStatus";
import { UsageOverview } from "@/components/dashboard/UsageOverview";
import { BudgetCard } from "@/components/dashboard/BudgetCard";
import { useWallet } from "@/contexts/WalletContext";
import { useAuth } from "@/contexts/AuthContext";
import { useGreeting } from "@/hooks/useGreeting";

interface HomeViewProps {
  onNavigate: (tab: string) => void;
}

export function HomeView({ onNavigate }: HomeViewProps) {
  const { wallet, autoTopUpRules, toggleAutoTopUpRule, transactions } = useWallet();
  const { profile } = useAuth();
  const { greeting } = useGreeting();

  const displayName = profile?.full_name?.split(" ")[0] || "User";

  // Map auto top-up rules to display format
  const displayRules = autoTopUpRules.map((rule) => ({
    id: rule.id,
    type: rule.type as "data" | "airtime",
    threshold: rule.type === "data" ? `${rule.threshold_percentage}%` : `${rule.threshold_percentage}%`,
    amount: rule.topup_amount,
    enabled: rule.is_enabled,
  }));

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

  const autoTopUps = monthlyTransactions.filter((tx) => tx.type === "auto_topup").length;

  const usageData = [
    { label: "Data Spent", current: dataSpent, previous: 0, unit: "₦", color: "text-accent" },
    { label: "Airtime Spent", current: airtimeSpent, previous: 0, unit: "₦", color: "text-primary" },
    { label: "Auto Top-Ups", current: autoTopUps, previous: 0, unit: "", color: "text-foreground" },
    { label: "Total Deposits", current: monthlyTransactions.filter(tx => tx.type === "deposit").reduce((sum, tx) => sum + tx.amount, 0), previous: 0, unit: "₦", color: "text-primary" },
  ];

  const handleToggleRule = (id: string) => {
    toggleAutoTopUpRule(id);
  };

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
            if (action === "autotopup") {
              onNavigate("topup");
            } else if (action === "history") {
              onNavigate("analytics");
            }
          }}
        />

        <AutoTopUpStatus
          rules={displayRules}
          onToggle={handleToggleRule}
          onViewAll={() => onNavigate("topup")}
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
