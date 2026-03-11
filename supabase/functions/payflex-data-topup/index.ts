/**
 * PAYFLEX DATA TOP-UP EDGE FUNCTION (Transaction-Safe)
 * =====================================================
 *
 * Handles data plan retrieval and secure purchase processing with full
 * transaction safety: idempotency, wallet locking, retry, auto-refund.
 *
 * ## Endpoints
 *
 * ### GET ?action=plans&network=mtn
 * Returns data plans from Payflex (with fallback) including 5% margin. Public.
 *
 * ### GET ?action=balance
 * Returns Payflex wallet balance. Public.
 *
 * ### POST (body: { phoneNumber, planId, network, amount, idempotencyKey? })
 * Processes a data purchase with full safety guarantees. Authenticated.
 *
 * @module payflex-data-topup
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PAYFLEX_API_KEY = Deno.env.get('PAYFLEX_API_KEY');
const PAYFLEX_BASE_URL = 'https://api.payflexng.com/v1';
const MARGIN_PERCENTAGE = 0.05;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 9000];

interface DataPlan {
  id: string;
  name: string;
  costPrice: number;
  finalPrice: number;
  network: string;
  validity: string;
  dataAmount: string;
}

function generateReference(): string {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
  return `txn_${date}_${rand}`;
}

function getCurrentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const BUDGET_THRESHOLDS = [50, 75, 90, 100];

async function createNotification(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  notification: { title: string; message: string; type: string; category: string; metadata?: Record<string, unknown> }
) {
  try {
    await adminClient.from("notifications").insert({ user_id: userId, ...notification, metadata: notification.metadata || {} });
  } catch (e) { console.error("[notification] Failed:", e); }
}

async function recordSpendingAndUpdateBudget(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  transactionId: string,
  amount: number
) {
  const currentMonth = getCurrentMonthYear();
  try {
    await adminClient.from("spending_events").insert({
      user_id: userId, transaction_id: transactionId, category: "DATA", amount,
    });

    const { data: budget } = await adminClient
      .from("user_budgets").select("*").eq("user_id", userId).eq("month_year", currentMonth).maybeSingle();
    if (!budget) return;

    const newAmountSpent = Number(budget.amount_spent) + amount;
    const budgetAmount = Number(budget.budget_amount);
    await adminClient.from("user_budgets")
      .update({ amount_spent: newAmountSpent, updated_at: new Date().toISOString() }).eq("id", budget.id);
    if (budgetAmount <= 0) return;

    const percentageUsed = Math.round((newAmountSpent / budgetAmount) * 100);
    const lastAlertLevel = budget.last_alert_level || 0;

    for (const threshold of BUDGET_THRESHOLDS) {
      if (percentageUsed >= threshold && lastAlertLevel < threshold) {
        const isOver = threshold >= 100;
        const remaining = Math.max(0, budgetAmount - newAmountSpent);
        await createNotification(adminClient, userId, {
          title: isOver ? "Monthly Budget Exceeded" : `${threshold}% Budget Used`,
          message: isOver
            ? `You've exceeded your monthly budget of ₦${budgetAmount.toLocaleString()}. Spent: ₦${newAmountSpent.toLocaleString()}.`
            : `You've used ${threshold}% of your budget. ₦${remaining.toLocaleString()} remaining.`,
          type: isOver ? "warning" : "info", category: "budget",
          metadata: { threshold, budgetAmount, amountSpent: newAmountSpent, percentageUsed, remaining },
        });
        await adminClient.from("user_budgets").update({ last_alert_level: threshold }).eq("id", budget.id);
        break;
      }
    }
  } catch (e) { console.error("[budget] Error:", e); }
}

async function callPayflexWithRetry(
  url: string, body: Record<string, unknown>, retries = MAX_RETRIES
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string; ambiguous?: boolean }> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${PAYFLEX_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        return { success: true, data: await response.json() };
      }
      const errorData = await response.json().catch(() => ({}));
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return { success: false, error: errorData.message || `Provider error: ${response.status}` };
      }
      console.warn(`[payflex] Attempt ${attempt + 1} failed (${response.status})`);
    } catch (err) {
      console.warn(`[payflex] Attempt ${attempt + 1} error:`, err);
      if (attempt === retries - 1) {
        return { success: false, error: err instanceof DOMException ? 'Provider timeout' : 'Network error', ambiguous: true };
      }
    }
    if (attempt < retries - 1) await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
  }
  return { success: false, error: 'All retry attempts failed', ambiguous: true };
}

function getFallbackPlans(network: string): DataPlan[] {
  const basePlans = [
    { id: '1gb', name: '1GB', costPrice: 300, dataAmount: '1GB', validity: '30 days' },
    { id: '2gb', name: '2GB', costPrice: 600, dataAmount: '2GB', validity: '30 days' },
    { id: '3gb', name: '3GB', costPrice: 900, dataAmount: '3GB', validity: '30 days' },
    { id: '5gb', name: '5GB', costPrice: 1500, dataAmount: '5GB', validity: '30 days' },
    { id: '10gb', name: '10GB', costPrice: 3000, dataAmount: '10GB', validity: '30 days' },
  ];
  return basePlans.map(plan => ({
    ...plan, finalPrice: Math.ceil(plan.costPrice * (1 + MARGIN_PERCENTAGE)), network: network.toUpperCase(),
  }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // ── GET ?action=plans ────────────────────────────────────────────────
    if (req.method === 'GET' && action === 'plans') {
      const network = url.searchParams.get('network') || 'mtn';
      try {
        const response = await fetch(`${PAYFLEX_BASE_URL}/data/plans?network=${network}`, {
          headers: { 'Authorization': `Bearer ${PAYFLEX_API_KEY}`, 'Content-Type': 'application/json' },
        });
        if (response.ok) {
          const data = await response.json();
          const plans = data.plans?.map((plan: Record<string, unknown>) => ({
            id: plan.id, name: plan.name, costPrice: plan.price,
            finalPrice: Math.ceil(Number(plan.price) * (1 + MARGIN_PERCENTAGE)),
            network: plan.network, validity: plan.validity, dataAmount: plan.data_amount,
          })) || getFallbackPlans(network);
          return new Response(JSON.stringify({ success: true, plans, source: 'payflex' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch { /* fallback */ }
      return new Response(JSON.stringify({ success: true, plans: getFallbackPlans(network), source: 'fallback' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── GET ?action=balance ──────────────────────────────────────────────
    if (req.method === 'GET' && action === 'balance') {
      const response = await fetch(`${PAYFLEX_BASE_URL}/wallet/balance`, {
        headers: { 'Authorization': `Bearer ${PAYFLEX_API_KEY}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        return new Response(JSON.stringify({ success: false, error: 'Failed to fetch balance' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const data = await response.json();
      return new Response(JSON.stringify({ success: true, balance: data.balance }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── POST — Secure data purchase ─────────────────────────────────────
    if (req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userId = user.id;
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);

      const { phoneNumber, planId, network, amount, idempotencyKey } = await req.json();

      if (!phoneNumber || !network || !amount) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const purchaseAmount = Number(amount);

      const txReference = idempotencyKey || generateReference();

      console.log(`[data] Purchase: user=${userId} phone=${cleanPhone} plan=${planId} amount=${purchaseAmount} ref=${txReference}`);

      // ── Idempotency check ──────────────────────────────────────────────
      const { data: existingTx } = await adminClient
        .from('transactions').select('id, status').eq('reference', txReference).maybeSingle();

      if (existingTx) {
        if (existingTx.status === 'completed') {
          return new Response(JSON.stringify({
            success: true, transactionId: existingTx.id, reference: txReference,
            message: 'Transaction already completed (idempotent)',
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ error: 'Transaction already exists', existingStatus: existingTx.status }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ── Lock wallet & deduct ───────────────────────────────────────────
      const { data: deductResult, error: deductError } = await adminClient
        .rpc('lock_and_deduct_wallet', { p_user_id: userId, p_amount: purchaseAmount, p_reference: txReference });

      if (deductError || !deductResult?.success) {
        return new Response(JSON.stringify({ error: deductResult?.error || deductError?.message || 'Wallet deduction failed' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { wallet_id, balance_before, balance_after } = deductResult;

      // ── Create transaction (INITIATED) ─────────────────────────────────
      const { data: txData, error: txInsertError } = await adminClient
        .from('transactions')
        .insert({
          wallet_id, user_id: userId, type: 'data_purchase',
          amount: purchaseAmount, balance_before, balance_after,
          status: 'initiated', reference: txReference,
          phone_number: cleanPhone, network: network.toUpperCase(), product_type: 'data',
          description: `Data purchase for ${cleanPhone}`,
          metadata: { plan_id: planId, initiated_at: new Date().toISOString() },
        })
        .select().single();

      if (txInsertError) {
        await adminClient.rpc('refund_wallet', { p_user_id: userId, p_amount: purchaseAmount, p_reference: txReference });
        return new Response(JSON.stringify({ error: 'Failed to create transaction' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ── Update to PROCESSING ───────────────────────────────────────────
      await adminClient.from('transactions').update({
        status: 'processing',
        metadata: { ...(txData.metadata as Record<string, unknown>), processing_at: new Date().toISOString() },
      }).eq('id', txData.id);

      // ── Call Payflex with retry ────────────────────────────────────────
      const providerResult = await callPayflexWithRetry(
        `${PAYFLEX_BASE_URL}/data/purchase`,
        { phone_number: cleanPhone, plan_id: planId, network: network.toLowerCase() }
      );

      // ── Handle result ──────────────────────────────────────────────────
      if (providerResult.success && providerResult.data) {
        const providerRef = providerResult.data.reference || providerResult.data.transaction_id || null;
        await adminClient.from('transactions').update({
          status: 'completed', provider_reference: providerRef as string,
          metadata: { ...(txData.metadata as Record<string, unknown>), completed_at: new Date().toISOString(), provider_response: providerResult.data },
        }).eq('id', txData.id);

        await recordSpendingAndUpdateBudget(adminClient, userId, txData.id, purchaseAmount);
        await createNotification(adminClient, userId, {
          title: 'Data Purchase Successful', message: `₦${purchaseAmount.toLocaleString()} data sent to ${cleanPhone}.`,
          type: 'success', category: 'transaction', metadata: { transactionId: txData.id, amount: purchaseAmount },
        });

        return new Response(JSON.stringify({
          success: true, transactionId: txData.id, reference: txReference,
          providerReference: providerRef, message: 'Data purchase successful',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      } else if (providerResult.ambiguous) {
        await adminClient.from('transactions').update({
          status: 'pending_verification',
          metadata: { ...(txData.metadata as Record<string, unknown>), pending_verification_at: new Date().toISOString(), provider_error: providerResult.error },
        }).eq('id', txData.id);

        await createNotification(adminClient, userId, {
          title: 'Data Processing', message: `Your ₦${purchaseAmount.toLocaleString()} data purchase is being verified.`,
          type: 'info', category: 'transaction', metadata: { transactionId: txData.id },
        });

        return new Response(JSON.stringify({
          success: false, transactionId: txData.id, reference: txReference,
          status: 'pending_verification', message: 'Purchase is being verified.',
        }), { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      } else {
        const { data: refundResult } = await adminClient
          .rpc('refund_wallet', { p_user_id: userId, p_amount: purchaseAmount, p_reference: txReference });

        await adminClient.from('transactions').update({
          status: 'failed',
          metadata: {
            ...(txData.metadata as Record<string, unknown>), failed_at: new Date().toISOString(),
            failure_reason: providerResult.error, refunded: refundResult?.success || false,
          },
        }).eq('id', txData.id);

        await createNotification(adminClient, userId, {
          title: 'Data Purchase Failed',
          message: `Your ₦${purchaseAmount.toLocaleString()} data purchase failed. ${refundResult?.success ? 'Wallet refunded.' : 'Contact support.'}`,
          type: 'error', category: 'transaction', metadata: { transactionId: txData.id, refunded: refundResult?.success },
        });

        return new Response(JSON.stringify({
          success: false, transactionId: txData.id, reference: txReference,
          error: providerResult.error, refunded: refundResult?.success || false,
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[payflex-data-topup] Unhandled error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
