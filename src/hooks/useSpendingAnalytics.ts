/**
 * @fileoverview Spending Analytics Hook
 * 
 * This hook provides access to comprehensive spending analytics calculated
 * by the backend. All analytics are derived from completed transactions
 * in the database - no calculations are performed on the frontend.
 * 
 * ## Analytics Provided
 * - Total spending (all-time and current month)
 * - Breakdown by type (airtime vs data)
 * - Breakdown by network provider
 * - 6-month spending trend
 * - Transaction count
 * 
 * ## Filter Options
 * - Date range: this_month, last_3_months, last_6_months, custom
 * - Network provider filter
 * - Custom date range with start/end dates
 * 
 * @example
 * import { useSpendingAnalytics } from "@/hooks/useSpendingAnalytics";
 * 
 * function AnalyticsDashboard() {
 *   const { analytics, isLoading, error, refetch } = useSpendingAnalytics({
 *     dateRange: 'last_3_months',
 *     network: 'MTN',
 *   });
 *   
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <ErrorState message={error} onRetry={refetch} />;
 *   
 *   return (
 *     <div>
 *       <h2>Total Spent: ₦{analytics.totalSpendAllTime.toLocaleString()}</h2>
 *       <PieChart data={analytics.spendByNetwork} />
 *       <BarChart data={analytics.monthlyTrend} />
 *     </div>
 *   );
 * }
 * 
 * @module useSpendingAnalytics
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Spending analytics data structure from the backend.
 * All values are in NGN (Nigerian Naira).
 * 
 * @interface SpendingAnalytics
 */
export interface SpendingAnalytics {
  /** Total spending across all completed transactions */
  totalSpendAllTime: number;
  /** Total spending in the current calendar month */
  totalSpendThisMonth: number;
  /** Total spent on airtime purchases */
  airtimeSpend: number;
  /** Total spent on data purchases */
  dataSpend: number;
  /** Spending breakdown by network provider */
  spendByNetwork: Record<string, number>;
  /** Last 6 months spending trend with type breakdown */
  monthlyTrend: Array<{
    /** Formatted month (e.g., "Jan '26") */
    month: string;
    /** Total amount for the month */
    amount: number;
    /** Airtime portion */
    airtime: number;
    /** Data portion */
    data: number;
  }>;
  /** Total number of transactions */
  transactionCount: number;
  /** ISO timestamp when analytics were calculated */
  lastUpdated: string;
}

/**
 * Available date range filter options.
 * 
 * @type DateRangeFilter
 */
export type DateRangeFilter = 'this_month' | 'last_3_months' | 'last_6_months' | 'custom';

/**
 * Configuration options for the analytics hook.
 * 
 * @interface UseSpendingAnalyticsOptions
 */
interface UseSpendingAnalyticsOptions {
  /** Predefined date range filter */
  dateRange?: DateRangeFilter;
  /** Start date for custom range (ISO string) */
  customStartDate?: string;
  /** End date for custom range (ISO string) */
  customEndDate?: string;
  /** Filter by network provider */
  network?: string;
}

/**
 * Hook return type for spending analytics.
 * 
 * @interface UseSpendingAnalyticsReturn
 */
interface UseSpendingAnalyticsReturn {
  /** Analytics data or null if not loaded */
  analytics: SpendingAnalytics | null;
  /** Whether analytics are being fetched */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Manually refetch analytics */
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching spending analytics.
 * 
 * Calls the `spending-analytics` edge function to retrieve
 * aggregated spending data. Analytics are recalculated on each fetch.
 * 
 * @param {UseSpendingAnalyticsOptions} options - Filter and configuration options
 * @returns {UseSpendingAnalyticsReturn} Analytics data and state
 * 
 * @example
 * // Basic usage - current month
 * const { analytics } = useSpendingAnalytics();
 * 
 * // With date range filter
 * const { analytics } = useSpendingAnalytics({ dateRange: 'last_6_months' });
 * 
 * // With network filter
 * const { analytics } = useSpendingAnalytics({ network: 'MTN' });
 * 
 * // With custom date range
 * const { analytics } = useSpendingAnalytics({
 *   dateRange: 'custom',
 *   customStartDate: '2026-01-01',
 *   customEndDate: '2026-01-31',
 * });
 */
export function useSpendingAnalytics(options: UseSpendingAnalyticsOptions = {}): UseSpendingAnalyticsReturn {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<SpendingAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { dateRange = 'this_month', customStartDate, customEndDate, network } = options;

  /**
   * Calculates date range based on the selected filter.
   * Returns ISO date strings for the start and end dates.
   */
  const getDateRange = useCallback((): { startDate?: string; endDate?: string } => {
    const now = new Date();
    const endDate = now.toISOString();

    switch (dateRange) {
      case 'this_month': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return { startDate: startOfMonth.toISOString(), endDate };
      }
      case 'last_3_months': {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        return { startDate: threeMonthsAgo.toISOString(), endDate };
      }
      case 'last_6_months': {
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        return { startDate: sixMonthsAgo.toISOString(), endDate };
      }
      case 'custom': {
        return {
          startDate: customStartDate,
          endDate: customEndDate || endDate,
        };
      }
      default:
        return {};
    }
  }, [dateRange, customStartDate, customEndDate]);

  /**
   * Fetches analytics from the backend.
   * Called automatically on mount and when dependencies change.
   */
  const fetchAnalytics = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      setError('Please log in to view analytics');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get active session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const { startDate, endDate } = getDateRange();
      
      // Build query params for filtering
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (network) params.append('network', network);

      // Call spending-analytics edge function
      const { data, error: fnError } = await supabase.functions.invoke('spending-analytics', {
        body: null,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to fetch analytics');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setAnalytics(data as SpendingAnalytics);
    } catch (err) {
      console.error('[useSpendingAnalytics] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      setAnalytics(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, getDateRange, network]);

  // Fetch analytics on mount and when dependencies change
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    isLoading,
    error,
    refetch: fetchAnalytics,
  };
}
