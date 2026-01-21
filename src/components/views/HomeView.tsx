import { User } from "lucide-react";
import { WalletCard } from "@/components/dashboard/WalletCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { UsageOverview } from "@/components/dashboard/UsageOverview";
import { BudgetCard } from "@/components/dashboard/BudgetCard";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
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
      {/* Skip to main content for accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Header */}
      <header
        className="sticky top-0 z-40 glass border-b border-border/50 px-5 py-4"
        role="banner"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground" aria-live="polite">{greeting}</p>
            <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationDropdown />
            <button 
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="View profile"
            >
              <User className="w-5 h-5 text-foreground" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main id="main-content" className="px-5 py-6 space-y-6" role="main">
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
      </main>
    </div>
  );
}
