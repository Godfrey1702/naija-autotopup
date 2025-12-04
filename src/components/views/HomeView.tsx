import { motion } from "framer-motion";
import { Bell, User } from "lucide-react";
import { WalletCard } from "@/components/dashboard/WalletCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { AutoTopUpStatus } from "@/components/dashboard/AutoTopUpStatus";
import { UsageOverview } from "@/components/dashboard/UsageOverview";
import { BudgetCard } from "@/components/dashboard/BudgetCard";

interface HomeViewProps {
  onNavigate: (tab: string) => void;
}

export function HomeView({ onNavigate }: HomeViewProps) {
  const walletBalance = 15750.50;

  const autoTopUpRules = [
    { id: "1", type: "data" as const, threshold: "50MB", amount: 500, enabled: true },
    { id: "2", type: "airtime" as const, threshold: "₦100", amount: 200, enabled: true },
  ];

  const usageData = [
    { label: "Data Used", current: 5.2, previous: 4.8, unit: "GB", color: "text-accent" },
    { label: "Airtime Spent", current: 2500, previous: 3100, unit: "₦", color: "text-primary" },
    { label: "Auto Top-Ups", current: 8, previous: 6, unit: "", color: "text-foreground" },
    { label: "Savings", current: 850, previous: 600, unit: "₦", color: "text-primary" },
  ];

  const handleToggleRule = (id: string) => {
    console.log("Toggle rule:", id);
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
            <p className="text-sm text-muted-foreground">Good morning</p>
            <h1 className="text-xl font-bold text-foreground">Adebayo</h1>
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
          balance={walletBalance}
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
          rules={autoTopUpRules}
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
