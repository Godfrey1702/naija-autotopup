import { useState } from "react";
import { ChevronLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpendingAnalytics, DateRangeFilter } from "@/hooks/useSpendingAnalytics";
import { AnalyticsSummaryCard } from "@/components/analytics/AnalyticsSummaryCard";
import { SpendingPieChart } from "@/components/analytics/SpendingPieChart";
import { MonthlyTrendChart } from "@/components/analytics/MonthlyTrendChart";
import { NetworkBreakdown } from "@/components/analytics/NetworkBreakdown";
import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters";
import { AnalyticsEmptyState } from "@/components/analytics/AnalyticsEmptyState";
import { ErrorState } from "@/components/ui/error-state";

interface AnalyticsViewProps {
  onBack: () => void;
}

export function AnalyticsView({ onBack }: AnalyticsViewProps) {
  const [dateRange, setDateRange] = useState<DateRangeFilter>('last_6_months');
  const [network, setNetwork] = useState<string>('all');

  const { analytics, isLoading, error, refetch } = useSpendingAnalytics({
    dateRange,
    network: network === 'all' ? undefined : network,
  });

  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;

  const getCurrentMonthName = () => {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const hasData = analytics && analytics.transactionCount > 0;

  return (
    <div className="min-h-screen gradient-hero pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border/50 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              aria-label="Go back to previous page"
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" aria-hidden="true" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Spending Analytics</h1>
              <p className="text-sm text-muted-foreground">{getCurrentMonthName()}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            aria-label={isLoading ? "Loading data" : "Refresh analytics data"}
          >
            <RefreshCw 
              className="w-4 h-4" 
              aria-hidden="true" 
            />
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="px-5 py-6 space-y-6">
        {/* Filters */}
        <div>
          <AnalyticsFilters
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            network={network}
            onNetworkChange={setNetwork}
          />
        </div>

        {/* Error State */}
        {error && (
          <div>
            <ErrorState
              type="generic"
              title="Failed to load analytics"
              message={error}
              onRetry={() => refetch()}
              retryLabel="Try Again"
            />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && !hasData && (
          <div>
            <AnalyticsEmptyState onAction={onBack} />
          </div>
        )}

        {/* Summary Cards */}
        {(isLoading || hasData) && (
          <div className="grid grid-cols-2 gap-3">
            <AnalyticsSummaryCard
              title="This Month"
              value={formatCurrency(analytics?.totalSpendThisMonth || 0)}
              isLoading={isLoading}
              accentColor="primary"
            />
            <AnalyticsSummaryCard
              title="All Time"
              value={formatCurrency(analytics?.totalSpendAllTime || 0)}
              isLoading={isLoading}
            />
            <AnalyticsSummaryCard
              title="Airtime"
              value={formatCurrency(analytics?.airtimeSpend || 0)}
              isLoading={isLoading}
              accentColor="primary"
            />
            <AnalyticsSummaryCard
              title="Data"
              value={formatCurrency(analytics?.dataSpend || 0)}
              isLoading={isLoading}
              accentColor="accent"
            />
          </div>
        )}

        {/* Pie Chart */}
        {(isLoading || hasData) && (
          <div>
            <SpendingPieChart
              airtimeSpend={analytics?.airtimeSpend || 0}
              dataSpend={analytics?.dataSpend || 0}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Monthly Trend */}
        {(isLoading || hasData) && (
          <div>
            <MonthlyTrendChart
              data={analytics?.monthlyTrend || []}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Network Breakdown */}
        {(isLoading || hasData) && (
          <div>
            <NetworkBreakdown
              spendByNetwork={analytics?.spendByNetwork || {}}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Transaction Count */}
        {hasData && (
          <div className="text-center text-xs text-muted-foreground">
            Based on {analytics.transactionCount} transaction{analytics.transactionCount !== 1 ? 's' : ''}
            {analytics.lastUpdated && (
              <> • Updated {new Date(analytics.lastUpdated).toLocaleTimeString()}</>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
