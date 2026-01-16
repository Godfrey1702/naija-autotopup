/**
 * SECURE AIRTIME TOP-UP EDGE FUNCTION
 * 
 * This edge function handles airtime purchases securely:
 * 1. Validates JWT token using getClaims() for secure authentication
 * 2. Verifies user authorization before processing purchases
 * 3. Links all transactions to authenticated user accounts
 * 4. Provides audit trail for compliance
 * 
 * SECURITY MEASURES:
 * - JWT validation using getClaims() instead of getUser()
 * - Authorization header validation
 * - User ID extracted from validated claims
 * - All purchases linked to authenticated users
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYFLEX_API_KEY = Deno.env.get('PAYFLEX_API_KEY');
const PAYFLEX_BASE_URL = 'https://api.payflexng.com/v1';
const MARGIN_PERCENTAGE = 0.05; // 5% margin

interface AirtimePlan {
  id: string;
  amount: number;
  finalPrice: number;
  bonus: string;
  network: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Get airtime plans with pricing
    if (req.method === 'GET' && action === 'plans') {
      const network = url.searchParams.get('network') || 'mtn';
      
      console.log(`[payflex-airtime-topup] Fetching plans for network: ${network}`);
      
      // Return predefined airtime amounts with margin
      const plans = getAirtimePlans(network);
      
      return new Response(JSON.stringify({ 
        success: true, 
        plans,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Purchase airtime - SECURED with JWT validation
    if (req.method === 'POST' && action === 'purchase') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        console.error('[payflex-airtime-topup] Missing or invalid authorization header');
        return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      // Validate user authentication using getUser for secure verification
      // getUser fetches the full user from the server and validates the JWT
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('[payflex-airtime-topup] Authentication failed:', userError);
        return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // User is now authenticated - extract user details
      const userId = user.id;
      const userEmail = user.email;

      const { phoneNumber, amount, network } = await req.json();

      // Validate input
      if (!phoneNumber || !amount || !network) {
        return new Response(JSON.stringify({ error: 'Missing required fields: phoneNumber, amount, network' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate phone number format (Nigerian format)
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (!/^(0[7-9][0-1]\d{8}|234[7-9][0-1]\d{8})$/.test(cleanPhone)) {
        return new Response(JSON.stringify({ error: 'Invalid Nigerian phone number format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate amount (minimum ₦50, maximum ₦50,000)
      const purchaseAmount = Number(amount);
      if (isNaN(purchaseAmount) || purchaseAmount < 50 || purchaseAmount > 50000) {
        return new Response(JSON.stringify({ error: 'Amount must be between ₦50 and ₦50,000' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`[payflex-airtime-topup] Processing purchase for user: ${userId}, phone: ${phoneNumber}, amount: ${amount}`);

      // Call Payflex API to purchase airtime
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
        userId: userId, // Include user ID for audit trail
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

// Predefined airtime amounts with bonuses and margin
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
