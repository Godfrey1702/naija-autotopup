/**
 * SECURE TRANSACTION UPDATE EDGE FUNCTION
 * ========================================
 *
 * Handles secure server-side transaction status updates and wallet funding.
 * Now uses atomic DB functions with wallet_ledger integration for full
 * audit trail compliance.
 *
 * ## Endpoints
 *
 * ### POST /update-status
 * Updates a transaction status (initiated/processing/pending → completed/failed).
 * Handles refunds for failed transactions and spending event recording.
 *
 * ### POST /fund-wallet
 * Adds funds using atomic fund_wallet_atomic DB function with ledger entry.
 *
 * ### POST /verify-transaction
 * Verifies a pending_verification transaction against the provider.
 *
 * @module secure-transaction-update
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYFLEX_API_KEY = Deno.env.get('PAYFLEX_API_KEY');
const PAYFLEX_BASE_URL = 'https://api.payflexng.com/v1';

const BUDGET_THRESHOLDS = [50, 75, 90, 100];

function getCurrentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// deno-lint-ignore no-explicit-any
async function createNotification(adminClient: any, userId: string, notification: {
  title: string; message: string; type: string; category: string; metadata?: Record<string, unknown>;
}) {
  try {
    await adminClient.from("notifications").insert({ user_id: userId, ...notification, metadata: notification.metadata || {} });
  } catch (e) { console.error("[notification] Failed:", e); }
}

// deno-lint-ignore no-explicit-any
async function recordSpendingAndUpdateBudget(adminClient: any, userId: string, transactionId: string, transactionType: string, amount: number) {
  const currentMonth = getCurrentMonthYear();
  const category = transactionType === "airtime_purchase" ? "AIRTIME" : "DATA";

  try {
    await adminClient.from("spending_events").insert({ user_id: userId, transaction_id: transactionId, category, amount });

    const { data: budget } = await adminClient
      .from("user_budgets").select("*").eq("user_id", userId).eq("month_year", currentMonth).maybeSingle();
    if (!budget) return;

    const newAmountSpent = Number(budget.amount_spent) + amount;
    const budgetAmount = Number(budget.budget_amount);
    await adminClient.from("user_budgets").update({ amount_spent: newAmountSpent, updated_at: new Date().toISOString() }).eq("id", budget.id);
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error("Missing configuration");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    // =====================================================================
    // POST /update-status
    // =====================================================================
    if (action === "update-status" && req.method === "POST") {
      const { transactionId, status, metadata } = await req.json();

      if (!transactionId || !status || !["completed", "failed"].includes(status)) {
        return new Response(JSON.stringify({ success: false, error: "Invalid parameters" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch transaction & verify ownership
      const { data: transaction, error: txError } = await adminClient
        .from("transactions")
        .select("*")
        .eq("id", transactionId)
        .eq("user_id", user.id)
        .single();

      if (txError || !transaction) {
        return new Response(JSON.stringify({ success: false, error: "Transaction not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Only allow updates from transitional states
      const allowedFromStatuses = ["pending", "initiated", "processing", "pending_verification"];
      if (!allowedFromStatuses.includes(transaction.status)) {
        return new Response(JSON.stringify({ success: false, error: `Cannot update from status '${transaction.status}'` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const existingMetadata = typeof transaction.metadata === 'object' && transaction.metadata !== null ? transaction.metadata : {};
      const mergedMetadata = { ...existingMetadata, ...metadata, [`${status}_at`]: new Date().toISOString() };

      // Update transaction
      await adminClient.from("transactions").update({ status, metadata: mergedMetadata }).eq("id", transactionId);

      // Handle completed purchase: record spending
      if (status === "completed" && (transaction.type === "airtime_purchase" || transaction.type === "data_purchase")) {
        await recordSpendingAndUpdateBudget(adminClient, user.id, transactionId, transaction.type, Number(transaction.amount));
      }

      // Handle failed purchase: auto-refund if wallet was already deducted
      if (status === "failed" && (transaction.type === "airtime_purchase" || transaction.type === "data_purchase")) {
        const { data: refundResult } = await adminClient.rpc('refund_wallet', {
          p_user_id: user.id, p_amount: Number(transaction.amount), p_reference: transaction.reference || transactionId,
        });

        if (refundResult?.success) {
          await adminClient.from("transactions").update({
            metadata: { ...mergedMetadata, refunded: true, refunded_at: new Date().toISOString() },
          }).eq("id", transactionId);
        }
      }

      // Notifications
      const txType = transaction.type === "airtime_purchase" ? "Airtime" : transaction.type === "data_purchase" ? "Data" : "Transaction";
      const amt = Number(transaction.amount);

      if (status === "completed") {
        await createNotification(adminClient, user.id, {
          title: `${txType} Successful`, message: `Your ${txType.toLowerCase()} purchase of ₦${amt.toLocaleString()} was successful.`,
          type: "success", category: "transaction", metadata: { transactionId, amount: amt },
        });
      } else {
        await createNotification(adminClient, user.id, {
          title: `${txType} Failed`, message: `Your ${txType.toLowerCase()} purchase of ₦${amt.toLocaleString()} failed. Your wallet has been refunded.`,
          type: "error", category: "transaction", metadata: { transactionId, amount: amt },
        });
      }

      return new Response(JSON.stringify({ success: true, transactionId }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =====================================================================
    // POST /fund-wallet — Atomic wallet funding with ledger
    // =====================================================================
    if (action === "fund-wallet" && req.method === "POST") {
      const { amount, reference } = await req.json();

      if (!amount || amount <= 0) {
        return new Response(JSON.stringify({ success: false, error: "Invalid amount" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (amount < 5000) {
        return new Response(JSON.stringify({ success: false, error: `Minimum top-up is ₦5,000` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const txReference = reference || `DEP-${Date.now()}`;

      // Atomic funding with ledger entry
      const { data: fundResult, error: fundError } = await adminClient
        .rpc('fund_wallet_atomic', { p_user_id: user.id, p_amount: amount, p_reference: txReference });

      if (fundError || !fundResult?.success) {
        return new Response(JSON.stringify({ success: false, error: fundResult?.error || fundError?.message || "Funding failed" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create completed deposit transaction
      const { data: txData, error: txError } = await adminClient
        .from("transactions")
        .insert({
          wallet_id: fundResult.wallet_id,
          user_id: user.id,
          type: "deposit",
          amount,
          balance_before: fundResult.balance_before,
          balance_after: fundResult.balance_after,
          status: "completed",
          reference: txReference,
          description: "Wallet Funded",
        })
        .select()
        .single();

      if (txError) {
        console.error("[fund-wallet] Transaction record failed:", txError);
      }

      await createNotification(adminClient, user.id, {
        title: "Wallet Funded",
        message: `₦${amount.toLocaleString()} added. New balance: ₦${fundResult.balance_after.toLocaleString()}`,
        type: "success", category: "transaction",
        metadata: { transactionId: txData?.id, amount, newBalance: fundResult.balance_after },
      });

      return new Response(JSON.stringify({
        success: true, transactionId: txData?.id, newBalance: fundResult.balance_after,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // =====================================================================
    // POST /verify-transaction — Verify pending_verification transactions
    // =====================================================================
    if (action === "verify-transaction" && req.method === "POST") {
      const { transactionId } = await req.json();

      const { data: transaction } = await adminClient
        .from("transactions")
        .select("*")
        .eq("id", transactionId)
        .eq("user_id", user.id)
        .eq("status", "pending_verification")
        .single();

      if (!transaction) {
        return new Response(JSON.stringify({ success: false, error: "Transaction not found or not pending verification" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Query provider for transaction status
      try {
        const verifyResponse = await fetch(
          `${PAYFLEX_BASE_URL}/transactions/verify?reference=${transaction.reference}`,
          { headers: { 'Authorization': `Bearer ${PAYFLEX_API_KEY}`, 'Content-Type': 'application/json' } }
        );

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          const providerStatus = verifyData.status?.toLowerCase();

          if (providerStatus === 'success' || providerStatus === 'completed') {
            await adminClient.from("transactions").update({
              status: "completed",
              provider_reference: verifyData.reference || verifyData.transaction_id,
              metadata: {
                ...(transaction.metadata as Record<string, unknown>),
                verified_at: new Date().toISOString(),
                provider_verification: verifyData,
              },
            }).eq("id", transactionId);

            if (transaction.type === "airtime_purchase" || transaction.type === "data_purchase") {
              await recordSpendingAndUpdateBudget(adminClient, user.id, transactionId, transaction.type, Number(transaction.amount));
            }

            await createNotification(adminClient, user.id, {
              title: "Purchase Verified", message: `Your ₦${Number(transaction.amount).toLocaleString()} purchase was verified successfully.`,
              type: "success", category: "transaction",
            });

            return new Response(JSON.stringify({ success: true, status: "completed" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });

          } else if (providerStatus === 'failed') {
            // Refund
            await adminClient.rpc('refund_wallet', {
              p_user_id: user.id, p_amount: Number(transaction.amount), p_reference: transaction.reference || transactionId,
            });

            await adminClient.from("transactions").update({
              status: "failed",
              metadata: {
                ...(transaction.metadata as Record<string, unknown>),
                verified_at: new Date().toISOString(),
                failure_reason: "Provider verification confirmed failure",
                refunded: true,
              },
            }).eq("id", transactionId);

            await createNotification(adminClient, user.id, {
              title: "Purchase Failed & Refunded",
              message: `Your ₦${Number(transaction.amount).toLocaleString()} purchase failed. Wallet refunded.`,
              type: "error", category: "transaction",
            });

            return new Response(JSON.stringify({ success: true, status: "failed", refunded: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        return new Response(JSON.stringify({ success: false, status: "still_pending", message: "Verification inconclusive. Try again later." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (e) {
        console.error("[verify-transaction] Error:", e);
        return new Response(JSON.stringify({ success: false, error: "Verification request failed" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ success: false, error: "Invalid endpoint" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[secure-transaction-update] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
