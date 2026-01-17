import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SpendingAnalytics {
  totalSpendAllTime: number;
  totalSpendThisMonth: number;
  airtimeSpend: number;
  dataSpend: number;
  spendByNetwork: Record<string, number>;
  monthlyTrend: Array<{ month: string; amount: number; airtime: number; data: number }>;
  transactionCount: number;
  lastUpdated: string;
}

export type DateRangeFilter = 'this_month' | 'last_3_months' | 'last_6_months' | 'custom';

interface UseSpendingAnalyticsOptions {
  dateRange?: DateRangeFilter;
  customStartDate?: string;
  customEndDate?: string;
  network?: string;
}

interface UseSpendingAnalyticsReturn {
  analytics: SpendingAnalytics | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSpendingAnalytics(options: UseSpendingAnalyticsOptions = {}): UseSpendingAnalyticsReturn {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<SpendingAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { dateRange = 'this_month', customStartDate, customEndDate, network } = options;

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

  const fetchAnalytics = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      setError('Please log in to view analytics');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const { startDate, endDate } = getDateRange();
      
      // Build query params
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (network) params.append('network', network);

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
