/**
 * @fileoverview Spending Analytics Hook
 * 
 * All analytics fetched via the src/api service layer.
 * 
 * @module useSpendingAnalytics
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { budgetService } from '@/api';

export interface SpendingAnalytics {
  totalSpendAllTime: number;
  totalSpendThisMonth: number;
  airtimeSpend: number;
  dataSpend: number;
  spendByNetwork: Record<string, number>;
  monthlyTrend: Array<{
    month: string;
    amount: number;
    airtime: number;
    data: number;
  }>;
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

  const { network } = options;

  const fetchAnalytics = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      setError('Please log in to view analytics');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await budgetService.getSpendingAnalytics();
      setAnalytics(data as SpendingAnalytics);
    } catch (err) {
      console.error('[useSpendingAnalytics] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      setAnalytics(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, network]);

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
