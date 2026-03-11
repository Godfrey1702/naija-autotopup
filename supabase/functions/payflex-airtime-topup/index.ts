/**
 * PAYFLEX AIRTIME TOP-UP EDGE FUNCTION (Transaction-Safe)
 * ========================================================
 *
 * Handles airtime plan retrieval and secure purchase processing with full
 * transaction safety: idempotency, wallet locking, retry, auto-refund.
 *
 * ## Endpoints
 *
 * ### GET ?action=plans&network=mtn
 * Returns predefined airtime plans with 5% margin pricing. Public.
 *
 * ### POST (body: { phoneNumber, amount, network, idempotencyKey? })
 * Processes an airtime purchase with full safety guarantees. Authenticated.
 *
 * ## Transaction Safety Features
 * - Idempotent reference prevents duplicate charges
 * - Atomic wallet locking via DB function (SELECT FOR UPDATE)
 * - Automatic refund on provider failure
 * - Retry with exponential backoff (3 attempts)
 * - Full audit trail in wallet_ledger
 * - Status machine: INITIATED → PROCESSING → COMPLETED / FAILED / PENDING_VERIFICATION
 *
 * @module payflex-airtime-topup
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
const RETRY_DELAYS = [1000, 3000, 9000]; // 1s, 3s, 9s

interface AirtimePlan {
  id: string;
  amount: number;
  finalPrice: number;
  bonus: string;
  network: string;
}

/** Generates a unique idempotent transaction reference. */
function generateReference(): string {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
  return `txn_${date}_${rand}`;
}

/** Returns current month in YYYY-MM format for budget tracking. */
function getCurrentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Budget alert thresholds. */
const BUDGET_THRESHOLDS = [50, 75, 90, 100];

/** Creates a notification record. */
async function createNotification(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  notification: { title: string; message: string; type: string; category: string; metadata?: Record<string, unknown> }
) {
  try {
    await adminClient.from("notifications").insert({
      user_id: userId,
      ...notification,
      metadata: notification.metadata || {},
    });
  } catch (e) {
    console.error("[notification] Failed:", e);
  }
}

/** Records spending event and updates budget with threshold notifications. */
async function recordSpendingAndUpdateBudget(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  transactionId: string,
  amount: number
) {
  const currentMonth = getCurrentMonthYear();
  try {
    await adminClient.from("spending_events").insert({
      user_id: userId,
      transaction_id: transactionId,
      category: "AIRTIME",
      amount,
    });

    const { data: budget } = await adminClient
      .from("user_budgets")
      .select("*")
      .eq("user_id", userId)
      .eq("month_year", currentMonth)
      .maybeSingle();

    if (!budget) return;

    const newAmountSpent = Number(budget.amount_spent) + amount;
    const budgetAmount = Number(budget.budget_amount);

    await adminClient
      .from("user_budgets")
      .update({ amount_spent: newAmountSpent, updated_at: new Date().toISOString() })
      .eq("id", budget.id);

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
          type: isOver ? "warning" : "info",
          category: "budget",
          metadata: { threshold, budgetAmount, amountSpent: newAmountSpent, percentageUsed, remaining },
        });
        await adminClient.from("user_budgets").update({ last_alert_level: threshold }).eq("id", budget.id);
        break;
      }
    }
  } catch (e) {
    console.error("[budget] Error:", e);
  }
}

/** Calls Payflex API with retry and exponential backoff. */
async function callPayflexWithRetry(
  url: string,
  body: Record<string, unknown>,
  retries = MAX_RETRIES
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string; ambiguous?: boolean }> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYFLEX_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      }

      const errorData = await response.json().catch(() => ({}));

      // 4xx errors are not retryable (except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return { success: false, error: errorData.message || `Provider error: ${response.status}` };
      }

      console.warn(`[payflex] Attempt ${attempt + 1} failed (${response.status}), retrying...`);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.warn(`[payflex] Attempt ${attempt + 1} timed out`);
        if (attempt === retries - 1) {
          return { success: false, error: 'Provider timeout', ambiguous: true };
        }
      } else {
        console.warn(`[payflex] Attempt ${attempt + 1} network error:`, err);
        if (attempt === retries - 1) {
          return { success: false, error: 'Network error', ambiguous: true };
        }
      }
    }

    // Wait before retry
    if (attempt < retries - 1) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
    }
  }
  return { success: false, error: 'All retry attempts failed', ambiguous: true };
}

/**
 * Returns predefined airtime plans with 5% margin.
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // =====================================================================
    // GET ?action=plans — Public plan retrieval
    // =====================================================================
    if (req.method === 'GET' && action === 'plans') {
      const network = url.searchParams.get('network') || 'mtn';
      return new Response(JSON.stringify({ success: true, plans: getAirtimePlans(network) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // =====================================================================
    // POST — Secure airtime purchase with full transaction safety
    // =====================================================================
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

      // Verify JWT
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

      // Parse & validate input
      const { phoneNumber, amount, network, idempotencyKey } = await req.json();

      if (!phoneNumber || !amount || !network) {
        return new Response(JSON.stringify({ error: 'Missing required fields: phoneNumber, amount, network' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (!/^(0[7-9][0-1]\d{8}|234[7-9][0-1]\d{8})$/.test(cleanPhone)) {
        return new Response(JSON.stringify({ error: 'Invalid Nigerian phone number format' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const purchaseAmount = Number(amount);
      if (isNaN(purchaseAmount) || purchaseAmount < 50 || purchaseAmount > 50000) {
        return new Response(JSON.stringify({ error: 'Amount must be between ₦50 and ₦50,000' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Generate idempotent reference
      const txReference = idempotencyKey || generateReference();

      console.log(`[airtime] Purchase: user=${userId} phone=${cleanPhone} amount=${purchaseAmount} ref=${txReference}`);

      // ── STEP 1: Idempotency check ──────────────────────────────────────
      const { data: existingTx } = await adminClient
        .from('transactions')
        .select('id, status, provider_reference')
        .eq('reference', txReference)
        .maybeSingle();

      if (existingTx) {
        console.log(`[airtime] Duplicate reference ${txReference}, status=${existingTx.status}`);
        if (existingTx.status === 'completed') {
          return new Response(JSON.stringify({
            success: true, transactionId: existingTx.id, reference: txReference,
            message: 'Transaction already completed (idempotent)',
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({
          error: 'Transaction already in progress or failed. Use a new reference.',
          existingStatus: existingTx.status,
        }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // ── STEP 2: Lock wallet & deduct balance atomically ────────────────
      const { data: deductResult, error: deductError } = await adminClient
        .rpc('lock_and_deduct_wallet', {
          p_user_id: userId,
          p_amount: purchaseAmount,
          p_reference: txReference,
        });

      if (deductError || !deductResult?.success) {
        const errMsg = deductResult?.error || deductError?.message || 'Wallet deduction failed';
        console.error(`[airtime] Wallet deduction failed: ${errMsg}`);
        return new Response(JSON.stringify({ error: errMsg }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { wallet_id, balance_before, balance_after } = deductResult;

      // ── STEP 3: Create transaction record (INITIATED) ──────────────────
      const { data: txData, error: txInsertError } = await adminClient
        .from('transactions')
        .insert({
          wallet_id,
          user_id: userId,
          type: 'airtime_purchase',
          amount: purchaseAmount,
          balance_before,
          balance_after,
          status: 'initiated',
          reference: txReference,
          phone_number: cleanPhone,
          network: network.toUpperCase(),
          product_type: 'airtime',
          description: `Airtime purchase for ${cleanPhone}`,
          metadata: { initiated_at: new Date().toISOString() },
        })
        .select()
        .single();

      if (txInsertError) {
        console.error(`[airtime] Transaction insert failed:`, txInsertError);
        // Refund wallet since we already deducted
        await adminClient.rpc('refund_wallet', { p_user_id: userId, p_amount: purchaseAmount, p_reference: txReference });
        return new Response(JSON.stringify({ error: 'Failed to create transaction record' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ── STEP 4: Update status to PROCESSING ────────────────────────────
      await adminClient
        .from('transactions')
        .update({ status: 'processing', metadata: { ...txData.metadata as Record<string, unknown>, processing_at: new Date().toISOString() } })
        .eq('id', txData.id);

      // ── STEP 5: Call Payflex API with retry ────────────────────────────
      const providerResult = await callPayflexWithRetry(
        `${PAYFLEX_BASE_URL}/airtime/purchase`,
        { phone_number: cleanPhone, amount: purchaseAmount, network: network.toLowerCase() }
      );

      // ── STEP 6: Handle provider response ───────────────────────────────
      if (providerResult.success && providerResult.data) {
        // SUCCESS → update transaction, record spending
        const providerRef = providerResult.data.reference || providerResult.data.transaction_id || null;

        await adminClient
          .from('transactions')
          .update({
            status: 'completed',
            provider_reference: providerRef as string,
            metadata: {
              ...(txData.metadata as Record<string, unknown>),
              completed_at: new Date().toISOString(),
              provider_response: providerResult.data,
            },
          })
          .eq('id', txData.id);

        // Record spending & update budget
        await recordSpendingAndUpdateBudget(adminClient, userId, txData.id, purchaseAmount);

        // Notification
        await createNotification(adminClient, userId, {
          title: 'Airtime Successful',
          message: `₦${purchaseAmount.toLocaleString()} airtime sent to ${cleanPhone}.`,
          type: 'success',
          category: 'transaction',
          metadata: { transactionId: txData.id, amount: purchaseAmount },
        });

        console.log(`[airtime] SUCCESS: txn=${txData.id} ref=${txReference}`);

        return new Response(JSON.stringify({
          success: true,
          transactionId: txData.id,
          reference: txReference,
          providerReference: providerRef,
          message: 'Airtime purchase successful',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      } else if (providerResult.ambiguous) {
        // AMBIGUOUS → mark pending verification
        await adminClient
          .from('transactions')
          .update({
            status: 'pending_verification',
            metadata: {
              ...(txData.metadata as Record<string, unknown>),
              pending_verification_at: new Date().toISOString(),
              provider_error: providerResult.error,
            },
          })
          .eq('id', txData.id);

        await createNotification(adminClient, userId, {
          title: 'Airtime Processing',
          message: `Your ₦${purchaseAmount.toLocaleString()} airtime purchase is being verified. We'll update you shortly.`,
          type: 'info',
          category: 'transaction',
          metadata: { transactionId: txData.id },
        });

        console.log(`[airtime] PENDING_VERIFICATION: txn=${txData.id}`);

        return new Response(JSON.stringify({
          success: false,
          transactionId: txData.id,
          reference: txReference,
          status: 'pending_verification',
          message: 'Purchase is being verified. You will be notified of the outcome.',
        }), { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      } else {
        // FAILED → refund wallet
        console.error(`[airtime] Provider failed: ${providerResult.error}`);

        const { data: refundResult } = await adminClient
          .rpc('refund_wallet', { p_user_id: userId, p_amount: purchaseAmount, p_reference: txReference });

        await adminClient
          .from('transactions')
          .update({
            status: 'failed',
            metadata: {
              ...(txData.metadata as Record<string, unknown>),
              failed_at: new Date().toISOString(),
              failure_reason: providerResult.error,
              refunded: refundResult?.success || false,
              refunded_at: refundResult?.success ? new Date().toISOString() : null,
            },
          })
          .eq('id', txData.id);

        await createNotification(adminClient, userId, {
          title: 'Airtime Failed',
          message: `Your ₦${purchaseAmount.toLocaleString()} airtime purchase failed. ${refundResult?.success ? 'Your wallet has been refunded.' : 'Please contact support.'}`,
          type: 'error',
          category: 'transaction',
          metadata: { transactionId: txData.id, amount: purchaseAmount, refunded: refundResult?.success },
        });

        return new Response(JSON.stringify({
          success: false,
          transactionId: txData.id,
          reference: txReference,
          error: providerResult.error,
          refunded: refundResult?.success || false,
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[payflex-airtime-topup] Unhandled error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
