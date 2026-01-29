/**
 * SPENDING ANALYTICS EDGE FUNCTION
 * =================================
 * 
 * This edge function provides aggregated spending analytics for the authenticated user.
 * It calculates various metrics from transaction data without performing any calculations
 * on the frontend, ensuring data integrity and consistent reporting.
 * 
 * ## Endpoint
 * 
 * ### GET /spending-analytics
 * Returns comprehensive spending analytics for the authenticated user.
 * 
 * **Query Parameters:**
 * - `startDate` (optional): ISO date string to filter transactions from
 * - `endDate` (optional): ISO date string to filter transactions until
 * - `network` (optional): Filter by network provider (MTN, Airtel, Glo, 9mobile)
 * 
 * **Response:**
 * ```json
 * {
 *   "totalSpendAllTime": 50000,
 *   "totalSpendThisMonth": 15000,
 *   "airtimeSpend": 30000,
 *   "dataSpend": 20000,
 *   "spendByNetwork": { "MTN": 25000, "Airtel": 15000, "Glo": 10000 },
 *   "monthlyTrend": [
 *     { "month": "Aug '25", "amount": 10000, "airtime": 6000, "data": 4000 }
 *   ],
 *   "transactionCount": 25,
 *   "lastUpdated": "2026-01-29T12:00:00.000Z"
 * }
 * ```
 * 
 * ## Analytics Calculated
 * - Total spending (all-time and current month)
 * - Spending breakdown by type (airtime vs data)
 * - Spending breakdown by network provider
 * - 6-month trend with monthly breakdowns
 * - Transaction count
 * 
 * ## Security
 * - Requires valid JWT token
 * - Only returns data for the authenticated user
 * - Only includes completed transactions
 * 
 * @module spending-analytics
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * CORS headers for cross-origin requests.
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Response structure for spending analytics.
 * All monetary values are in NGN (Nigerian Naira).
 */
interface AnalyticsResponse {
  /** Total spending across all completed airtime/data transactions */
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
    /** Formatted month string (e.g., "Jan '26") */
    month: string;
    /** Total amount for the month */
    amount: number;
    /** Airtime portion */
    airtime: number;
    /** Data portion */
    data: number;
  }>;
  /** Total number of transactions matching the filter */
  transactionCount: number;
  /** ISO timestamp when analytics were calculated */
  lastUpdated: string;
}

/**
 * Main request handler for the spending-analytics edge function.
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[spending-analytics] Request received');

    // Validate authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[spending-analytics] Missing or invalid Authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with user's auth token
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[spending-analytics] Authentication failed:', userError);
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    console.log('[spending-analytics] Authenticated user:', userId);

    // Parse optional query parameters for filtering
    const url = new URL(req.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const network = url.searchParams.get('network');

    console.log('[spending-analytics] Filters:', { startDate, endDate, network });

    // Build query for completed airtime and data transactions only
    let baseQuery = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .in('type', ['airtime_purchase', 'data_purchase']);

    // Apply optional date range filters
    if (startDate) {
      baseQuery = baseQuery.gte('created_at', startDate);
    }
    if (endDate) {
      baseQuery = baseQuery.lte('created_at', endDate);
    }

    const { data: transactions, error: txError } = await baseQuery.order('created_at', { ascending: false });

    if (txError) {
      console.error('[spending-analytics] Error fetching transactions:', txError);
      return new Response(JSON.stringify({ error: 'Failed to fetch transactions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[spending-analytics] Fetched transactions:', transactions?.length || 0);

    // Calculate analytics from transaction data
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Initialize accumulators
    let totalSpendAllTime = 0;
    let totalSpendThisMonth = 0;
    let airtimeSpend = 0;
    let dataSpend = 0;
    const spendByNetwork: Record<string, number> = {};
    const monthlyData: Record<string, { amount: number; airtime: number; data: number }> = {};

    // Pre-initialize last 6 months for consistent trend data
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
      monthlyData[monthKey] = { amount: 0, airtime: 0, data: 0 };
    }

    // Apply optional network filter to transactions
    const filteredTransactions = network
      ? transactions?.filter(tx => {
          const metadata = tx.metadata as Record<string, unknown> || {};
          return metadata.network?.toString().toLowerCase() === network.toLowerCase();
        })
      : transactions;

    // Process each transaction
    for (const tx of filteredTransactions || []) {
      const amount = Number(tx.amount) || 0;
      const txDate = new Date(tx.created_at);
      const monthKey = tx.created_at.slice(0, 7);
      const metadata = tx.metadata as Record<string, unknown> || {};
      const txNetwork = (metadata.network as string) || 'Unknown';

      // Accumulate total all-time spending
      totalSpendAllTime += amount;

      // Accumulate current month spending
      if (txDate >= startOfMonth) {
        totalSpendThisMonth += amount;
      }

      // Accumulate by transaction type
      if (tx.type === 'airtime_purchase') {
        airtimeSpend += amount;
      } else if (tx.type === 'data_purchase') {
        dataSpend += amount;
      }

      // Accumulate by network provider
      spendByNetwork[txNetwork] = (spendByNetwork[txNetwork] || 0) + amount;

      // Accumulate monthly trend data (last 6 months only)
      if (txDate >= sixMonthsAgo && monthlyData[monthKey]) {
        monthlyData[monthKey].amount += amount;
        if (tx.type === 'airtime_purchase') {
          monthlyData[monthKey].airtime += amount;
        } else if (tx.type === 'data_purchase') {
          monthlyData[monthKey].data += amount;
        }
      }
    }

    // Format monthly trend data for frontend display
    const monthlyTrend = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        ...data,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Construct response
    const analytics: AnalyticsResponse = {
      totalSpendAllTime,
      totalSpendThisMonth,
      airtimeSpend,
      dataSpend,
      spendByNetwork,
      monthlyTrend,
      transactionCount: filteredTransactions?.length || 0,
      lastUpdated: now.toISOString(),
    };

    console.log('[spending-analytics] Analytics calculated:', {
      totalSpendAllTime,
      totalSpendThisMonth,
      transactionCount: analytics.transactionCount,
    });

    return new Response(JSON.stringify(analytics), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[spending-analytics] Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
