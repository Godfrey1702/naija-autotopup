import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsResponse {
  totalSpendAllTime: number;
  totalSpendThisMonth: number;
  airtimeSpend: number;
  dataSpend: number;
  spendByNetwork: Record<string, number>;
  monthlyTrend: Array<{ month: string; amount: number; airtime: number; data: number }>;
  transactionCount: number;
  lastUpdated: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[spending-analytics] Request received');

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[spending-analytics] Missing or invalid Authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with user's auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validate user authentication
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

    // Parse query parameters for date filtering
    const url = new URL(req.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const network = url.searchParams.get('network');

    console.log('[spending-analytics] Filters:', { startDate, endDate, network });

    // Build base query for completed transactions (airtime and data only)
    let baseQuery = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .in('type', ['airtime_purchase', 'data_purchase']);

    // Apply date filters if provided
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

    // Calculate analytics
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    let totalSpendAllTime = 0;
    let totalSpendThisMonth = 0;
    let airtimeSpend = 0;
    let dataSpend = 0;
    const spendByNetwork: Record<string, number> = {};
    const monthlyData: Record<string, { amount: number; airtime: number; data: number }> = {};

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
      monthlyData[monthKey] = { amount: 0, airtime: 0, data: 0 };
    }

    // Filter transactions by network if specified
    const filteredTransactions = network
      ? transactions?.filter(tx => {
          const metadata = tx.metadata as Record<string, unknown> || {};
          return metadata.network?.toString().toLowerCase() === network.toLowerCase();
        })
      : transactions;

    // Process transactions
    for (const tx of filteredTransactions || []) {
      const amount = Number(tx.amount) || 0;
      const txDate = new Date(tx.created_at);
      const monthKey = tx.created_at.slice(0, 7);
      const metadata = tx.metadata as Record<string, unknown> || {};
      const txNetwork = (metadata.network as string) || 'Unknown';

      // Total all time
      totalSpendAllTime += amount;

      // Total this month
      if (txDate >= startOfMonth) {
        totalSpendThisMonth += amount;
      }

      // By type
      if (tx.type === 'airtime_purchase') {
        airtimeSpend += amount;
      } else if (tx.type === 'data_purchase') {
        dataSpend += amount;
      }

      // By network
      spendByNetwork[txNetwork] = (spendByNetwork[txNetwork] || 0) + amount;

      // Monthly trend (last 6 months only)
      if (txDate >= sixMonthsAgo && monthlyData[monthKey]) {
        monthlyData[monthKey].amount += amount;
        if (tx.type === 'airtime_purchase') {
          monthlyData[monthKey].airtime += amount;
        } else if (tx.type === 'data_purchase') {
          monthlyData[monthKey].data += amount;
        }
      }
    }

    // Format monthly trend for frontend
    const monthlyTrend = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        ...data,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

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
