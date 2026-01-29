/**
 * PAYFLEX AIRTIME TOP-UP EDGE FUNCTION
 * =====================================
 * 
 * This edge function handles airtime purchases through the Payflex VTU API.
 * It provides both plan retrieval and secure purchase functionality.
 * 
 * ## Endpoints
 * 
 * ### GET /payflex-airtime-topup?action=plans&network=mtn
 * Retrieves available airtime plans with pricing (includes 5% margin).
 * 
 * **Query Parameters:**
 * - `action`: Must be "plans"
 * - `network`: Network provider (mtn, airtel, glo, 9mobile)
 * 
 * **Response:**
 * ```json
 * {
 *   "success": true,
 *   "plans": [
 *     { "id": "airtime-100", "amount": 100, "finalPrice": 105, "bonus": "0%", "network": "MTN" }
 *   ]
 * }
 * ```
 * 
 * ### POST /payflex-airtime-topup?action=purchase
 * Processes an airtime purchase (requires authentication).
 * 
 * **Request Body:**
 * ```json
 * {
 *   "phoneNumber": "08012345678",
 *   "amount": 500,
 *   "network": "mtn"
 * }
 * ```
 * 
 * **Response:**
 * ```json
 * {
 *   "success": true,
 *   "transactionId": "TXN123",
 *   "reference": "REF456",
 *   "userId": "user-uuid",
 *   "message": "Airtime purchase successful"
 * }
 * ```
 * 
 * ## Security
 * - Plan retrieval is public (no auth required)
 * - Purchases require valid JWT authentication
 * - User ID is logged for audit trail
 * - Phone number validation (Nigerian format)
 * - Amount validation (₦50 - ₦50,000)
 * 
 * ## Pricing
 * All prices include a 5% margin over Payflex base cost.
 * 
 * @module payflex-airtime-topup
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
 * Structure for an airtime plan with pricing.
 */
interface AirtimePlan {
  /** Unique plan identifier */
  id: string;
  /** Base airtime amount in NGN */
  amount: number;
  /** Final price including margin */
  finalPrice: number;
  /** Bonus percentage (e.g., "5%") */
  bonus: string;
  /** Network provider in uppercase */
  network: string;
}

/**
 * Main request handler for the payflex-airtime-topup edge function.
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
    // GET ?action=plans - Retrieve airtime plans (public endpoint)
    // =========================================================================
    if (req.method === 'GET' && action === 'plans') {
      const network = url.searchParams.get('network') || 'mtn';
      
      console.log(`[payflex-airtime-topup] Fetching plans for network: ${network}`);
      
      // Return predefined airtime amounts with margin applied
      const plans = getAirtimePlans(network);
      
      return new Response(JSON.stringify({ 
        success: true, 
        plans,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // =========================================================================
    // POST ?action=purchase - Process airtime purchase (authenticated)
    // =========================================================================
    if (req.method === 'POST' && action === 'purchase') {
      // Validate authorization header
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        console.error('[payflex-airtime-topup] Missing or invalid authorization header');
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
        console.error('[payflex-airtime-topup] Authentication failed:', userError);
        return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userId = user.id;
      const userEmail = user.email;

      // Parse request body
      const { phoneNumber, amount, network } = await req.json();

      // Validate required fields
      if (!phoneNumber || !amount || !network) {
        return new Response(JSON.stringify({ error: 'Missing required fields: phoneNumber, amount, network' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate Nigerian phone number format
      // Accepts: 0701XXXXXXX, 0801XXXXXXX, or 234XXXXXXXXXX
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (!/^(0[7-9][0-1]\d{8}|234[7-9][0-1]\d{8})$/.test(cleanPhone)) {
        return new Response(JSON.stringify({ error: 'Invalid Nigerian phone number format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate amount range
      const purchaseAmount = Number(amount);
      if (isNaN(purchaseAmount) || purchaseAmount < 50 || purchaseAmount > 50000) {
        return new Response(JSON.stringify({ error: 'Amount must be between ₦50 and ₦50,000' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`[payflex-airtime-topup] Processing purchase for user: ${userId}, phone: ${phoneNumber}, amount: ${amount}`);

      // Call Payflex API to process the airtime purchase
      const purchaseResponse = await fetch(`${PAYFLEX_BASE_URL}/airtime/purchase`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYFLEX_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: cleanPhone,
          amount: purchaseAmount,
          network: network.toLowerCase(),
        }),
      });

      if (!purchaseResponse.ok) {
        const errorData = await purchaseResponse.json().catch(() => ({}));
        console.error(`[payflex-airtime-topup] Purchase failed:`, errorData);
        return new Response(JSON.stringify({ 
          success: false, 
          error: errorData.message || 'Airtime purchase failed' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const purchaseData = await purchaseResponse.json();
      
      console.log(`[payflex-airtime-topup] Purchase successful for user ${userId}:`, purchaseData);

      return new Response(JSON.stringify({ 
        success: true,
        transactionId: purchaseData.transaction_id,
        reference: purchaseData.reference,
        userId: userId, // Include for audit trail
        message: 'Airtime purchase successful'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[payflex-airtime-topup] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Generates predefined airtime plans with pricing and bonuses.
 * All prices include a 5% margin over base cost.
 * 
 * @param network - Network provider name (e.g., "mtn", "airtel")
 * @returns Array of airtime plans with pricing
 * 
 * @example
 * const plans = getAirtimePlans("mtn");
 * // Returns: [{ id: "airtime-100", amount: 100, finalPrice: 105, ... }]
 */
function getAirtimePlans(network: string): AirtimePlan[] {
  const basePlans = [
    { id: 'airtime-100', amount: 100, bonus: '0%' },
    { id: 'airtime-200', amount: 200, bonus: '0%' },
    { id: 'airtime-500', amount: 500, bonus: '2%' },
    { id: 'airtime-1000', amount: 1000, bonus: '3%' },
    { id: 'airtime-2000', amount: 2000, bonus: '4%' },
    { id: 'airtime-5000', amount: 5000, bonus: '5%' },
  ];

  return basePlans.map(plan => ({
    ...plan,
    finalPrice: Math.ceil(plan.amount * (1 + MARGIN_PERCENTAGE)),
    network: network.toUpperCase(),
  }));
}
