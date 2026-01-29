/**
 * PAYFLEX DATA TOP-UP EDGE FUNCTION
 * ==================================
 * 
 * This edge function handles data bundle purchases through the Payflex VTU API.
 * It provides plan retrieval, purchase processing, and balance checking.
 * 
 * ## Endpoints
 * 
 * ### GET /payflex-data-topup?action=plans&network=mtn
 * Retrieves available data plans with pricing (includes 5% margin).
 * Falls back to predefined plans if Payflex API is unavailable.
 * 
 * **Response:**
 * ```json
 * {
 *   "success": true,
 *   "plans": [
 *     { "id": "1gb", "name": "1GB", "costPrice": 300, "finalPrice": 315, "validity": "30 days", "dataAmount": "1GB", "network": "MTN" }
 *   ],
 *   "source": "payflex" | "fallback"
 * }
 * ```
 * 
 * ### POST /payflex-data-topup?action=purchase
 * Processes a data purchase (requires authentication).
 * 
 * **Request Body:**
 * ```json
 * {
 *   "phoneNumber": "08012345678",
 *   "planId": "1gb",
 *   "network": "mtn",
 *   "amount": 315
 * }
 * ```
 * 
 * ### GET /payflex-data-topup?action=balance
 * Checks the Payflex wallet balance (for monitoring).
 * 
 * ## Pricing
 * All prices include a 5% margin over Payflex base cost.
 * 
 * ## Security
 * - Plan retrieval and balance check are public
 * - Purchases require valid JWT authentication
 * - User ID is logged for audit trail
 * 
 * @module payflex-data-topup
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

/** Payflex API key from environment */
const PAYFLEX_API_KEY = Deno.env.get('PAYFLEX_API_KEY');

/** Payflex API base URL */
const PAYFLEX_BASE_URL = 'https://api.payflexng.com/v1';

/** Margin percentage added to Payflex base prices (5%) */
const MARGIN_PERCENTAGE = 0.05;

/**
 * Structure for a data plan with pricing.
 */
interface DataPlan {
  /** Unique plan identifier */
  id: string;
  /** Display name (e.g., "1GB") */
  name: string;
  /** Base cost from Payflex in NGN */
  costPrice: number;
  /** Final price including margin */
  finalPrice: number;
  /** Network provider in uppercase */
  network: string;
  /** Validity period (e.g., "30 days") */
  validity: string;
  /** Data allocation (e.g., "1GB") */
  dataAmount: string;
}

/**
 * Main request handler for the payflex-data-topup edge function.
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // =========================================================================
    // GET ?action=plans - Retrieve data plans (public endpoint)
    // =========================================================================
    if (req.method === 'GET' && action === 'plans') {
      const network = url.searchParams.get('network') || 'mtn';
      
      console.log(`[payflex-data-topup] Fetching plans for network: ${network}`);
      
      // Attempt to fetch plans from Payflex API
      const response = await fetch(`${PAYFLEX_BASE_URL}/data/plans?network=${network}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYFLEX_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`[payflex-data-topup] Payflex API error: ${response.status}`);
        // Return fallback plans if Payflex API is unavailable
        const fallbackPlans = getFallbackPlans(network);
        return new Response(JSON.stringify({ 
          success: true, 
          plans: fallbackPlans,
          source: 'fallback'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      
      // Transform Payflex response and add margin to each plan
      const plansWithMargin = data.plans?.map((plan: any) => ({
        id: plan.id,
        name: plan.name,
        costPrice: plan.price,
        finalPrice: Math.ceil(plan.price * (1 + MARGIN_PERCENTAGE)),
        network: plan.network,
        validity: plan.validity,
        dataAmount: plan.data_amount,
      })) || getFallbackPlans(network);

      console.log(`[payflex-data-topup] Returning ${plansWithMargin.length} plans`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        plans: plansWithMargin,
        source: 'payflex'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // =========================================================================
    // POST ?action=purchase - Process data purchase (authenticated)
    // =========================================================================
    if (req.method === 'POST' && action === 'purchase') {
      // Validate authorization header
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create Supabase client and verify user
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      // Validate JWT by fetching user from server
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('[payflex-data-topup] Authentication failed:', userError);
        return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userId = user.id;

      // Parse request body
      const { phoneNumber, planId, network, amount } = await req.json();

      console.log(`[payflex-data-topup] Processing purchase for user: ${userId}, phone: ${phoneNumber}, plan: ${planId}`);

      // Call Payflex API to process the data purchase
      const purchaseResponse = await fetch(`${PAYFLEX_BASE_URL}/data/purchase`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYFLEX_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          plan_id: planId,
          network: network,
        }),
      });

      if (!purchaseResponse.ok) {
        const errorData = await purchaseResponse.json().catch(() => ({}));
        console.error(`[payflex-data-topup] Purchase failed:`, errorData);
        return new Response(JSON.stringify({ 
          success: false, 
          error: errorData.message || 'Data purchase failed' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const purchaseData = await purchaseResponse.json();
      
      console.log(`[payflex-data-topup] Purchase successful:`, purchaseData);

      return new Response(JSON.stringify({ 
        success: true,
        transactionId: purchaseData.transaction_id,
        reference: purchaseData.reference,
        message: 'Data purchase successful'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // =========================================================================
    // GET ?action=balance - Check Payflex wallet balance
    // =========================================================================
    if (req.method === 'GET' && action === 'balance') {
      const response = await fetch(`${PAYFLEX_BASE_URL}/wallet/balance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYFLEX_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch balance' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      
      return new Response(JSON.stringify({ 
        success: true,
        balance: data.balance
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[payflex-data-topup] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Generates fallback data plans when Payflex API is unavailable.
 * All prices include a 5% margin over base cost.
 * 
 * @param network - Network provider name
 * @returns Array of fallback data plans
 * 
 * @example
 * const plans = getFallbackPlans("mtn");
 */
function getFallbackPlans(network: string): DataPlan[] {
  const basePlans = [
    { id: '1gb', name: '1GB', costPrice: 300, dataAmount: '1GB', validity: '30 days' },
    { id: '2gb', name: '2GB', costPrice: 600, dataAmount: '2GB', validity: '30 days' },
    { id: '3gb', name: '3GB', costPrice: 900, dataAmount: '3GB', validity: '30 days' },
    { id: '5gb', name: '5GB', costPrice: 1500, dataAmount: '5GB', validity: '30 days' },
    { id: '10gb', name: '10GB', costPrice: 3000, dataAmount: '10GB', validity: '30 days' },
  ];

  return basePlans.map(plan => ({
    ...plan,
    finalPrice: Math.ceil(plan.costPrice * (1 + MARGIN_PERCENTAGE)),
    network: network.toUpperCase(),
  }));
}
