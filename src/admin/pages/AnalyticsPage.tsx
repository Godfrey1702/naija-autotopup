/**
 * @fileoverview Admin Analytics Overview page.
 * Displays spending trends, active users, and platform-wide metrics.
 */

import { useEffect, useState } from "react";
import { getAnalytics } from "@/api/admin";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/admin/components/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TrendingUp, Users, Wallet, ArrowLeftRight } from "lucide-react";

interface AnalyticsData {
  activeUsersToday: number;
  activeUsersWeek: number;
  totalSpendingToday: number;
  totalSpendingWeek: number;
  topNetworks: { network: string; count: number; amount: number }[];
  dailyTrend: { date: string; amount: number; count: number }[];
}

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("week");

  useEffect(() => {
    setIsLoading(true);
    getAnalytics({ period })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setIsLoading(false));
  }, [period]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform-wide spending and activity</p>
        </div>
        <div className="flex gap-2">
          {["week", "month", "quarter"].map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p)}
              className="capitalize"
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Users Today"
          value={data?.activeUsersToday ?? 0}
          icon={Users}
          isLoading={isLoading}
        />
        <StatCard
          title="Active Users This Week"
          value={data?.activeUsersWeek ?? 0}
          icon={Users}
          isLoading={isLoading}
        />
        <StatCard
          title="Spending Today"
          value={`₦${(data?.totalSpendingToday ?? 0).toLocaleString()}`}
          icon={Wallet}
          isLoading={isLoading}
        />
        <StatCard
          title="Spending This Week"
          value={`₦${(data?.totalSpendingWeek ?? 0).toLocaleString()}`}
          icon={TrendingUp}
          isLoading={isLoading}
        />
      </div>

      {/* Top Networks */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Top Networks</h3>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : data?.topNetworks && data.topNetworks.length > 0 ? (
          <div className="space-y-3">
            {data.topNetworks.map((n) => (
              <div key={n.network} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ArrowLeftRight className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium capitalize">{n.network}</p>
                    <p className="text-xs text-muted-foreground">{n.count} transactions</p>
                  </div>
                </div>
                <p className="text-sm font-semibold">₦{n.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No data available</p>
        )}
      </Card>

      {/* Daily Trend */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Daily Spending Trend</h3>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : data?.dailyTrend && data.dailyTrend.length > 0 ? (
          <div className="space-y-2">
            {data.dailyTrend.map((d) => (
              <div key={d.date} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{d.date}</span>
                <div className="flex gap-4">
                  <span className="text-muted-foreground">{d.count} txns</span>
                  <span className="font-semibold">₦{d.amount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No trend data available</p>
        )}
      </Card>
    </div>
  );
}
