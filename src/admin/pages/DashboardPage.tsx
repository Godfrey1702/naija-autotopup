/**
 * @fileoverview Admin Dashboard Overview page.
 * Displays key metrics: total users, revenue, active top-ups, etc.
 */

import { useEffect, useState } from "react";
import { StatCard } from "@/admin/components/StatCard";
import { getDashboardMetrics } from "@/api/admin";
import { Users, Wallet, ArrowLeftRight, CalendarClock, TrendingUp, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Metrics {
  totalUsers: number;
  totalWalletBalance: number;
  totalTransactions: number;
  activeSchedules: number;
  recentTransactions: number;
  totalRevenue: number;
}

export function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardMetrics()
      .then((data) => setMetrics(data))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of platform metrics</p>
      </div>

      {error && (
        <Card className="p-4 border-destructive/50 bg-destructive/5">
          <p className="text-sm text-destructive">{error}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Make sure the admin API edge function is deployed and you have admin privileges.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Users"
          value={metrics?.totalUsers ?? 0}
          subtitle="Registered accounts"
          icon={Users}
          isLoading={isLoading}
        />
        <StatCard
          title="Total Wallet Balance"
          value={`₦${(metrics?.totalWalletBalance ?? 0).toLocaleString()}`}
          subtitle="Across all wallets"
          icon={Wallet}
          isLoading={isLoading}
        />
        <StatCard
          title="Total Transactions"
          value={metrics?.totalTransactions ?? 0}
          subtitle="All time"
          icon={ArrowLeftRight}
          isLoading={isLoading}
        />
        <StatCard
          title="Active Schedules"
          value={metrics?.activeSchedules ?? 0}
          subtitle="Recurring top-ups"
          icon={CalendarClock}
          isLoading={isLoading}
        />
        <StatCard
          title="Recent Transactions"
          value={metrics?.recentTransactions ?? 0}
          subtitle="Last 24 hours"
          icon={Activity}
          isLoading={isLoading}
        />
        <StatCard
          title="Total Revenue"
          value={`₦${(metrics?.totalRevenue ?? 0).toLocaleString()}`}
          subtitle="Completed purchases"
          icon={TrendingUp}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
