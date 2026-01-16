import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYFLEX_API_KEY = Deno.env.get('PAYFLEX_API_KEY');
const PAYFLEX_BASE_URL = 'https://api.payflexng.com/v1';
const MARGIN_PERCENTAGE = 0.05; // 5% margin

interface DataPlan {
  id: string;
  name: string;
  costPrice: number;
  finalPrice: number;
  network: string;
  validity: string;
  dataAmount: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Get data plans with pricing
    if (req.method === 'GET' && action === 'plans') {
      const network = url.searchParams.get('network') || 'mtn';
      
      console.log(`[payflex-data-topup] Fetching plans for network: ${network}`);
      
      // Fetch plans from Payflex API
      const response = await fetch(`${PAYFLEX_BASE_URL}/data/plans?network=${network}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYFLEX_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`[payflex-data-topup] Payflex API error: ${response.status}`);
        // Return fallback plans if API fails
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
      
      // Add margin to each plan
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

    // Purchase data - SECURED with JWT validation
    if (req.method === 'POST' && action === 'purchase') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('[payflex-data-topup] Authentication failed:', userError);
        return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // User is now authenticated - proceed with purchase
      const userId = user.id;

      const { phoneNumber, planId, network, amount } = await req.json();

      console.log(`[payflex-data-topup] Processing purchase for user: ${userId}, phone: ${phoneNumber}, plan: ${planId}`);

      // Call Payflex API to purchase data
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

    // Check balance
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

// Fallback plans with 5% margin already applied
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
