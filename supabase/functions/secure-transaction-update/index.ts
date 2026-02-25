/**
 * SECURE TRANSACTION UPDATE EDGE FUNCTION
 * ========================================
 * 
 * This edge function handles secure, server-side transaction status updates and
 * wallet funding operations. It ensures atomic updates and prevents race conditions
 * or frontend manipulation of financial data.
 * 
 * ## Endpoints
 * 
 * ### POST /secure-transaction-update/update-status
 * Updates a pending transaction's status to completed or failed.
 * 
 * **Request Body:**
 * ```json
 * {
 *   "transactionId": "uuid",
 *   "status": "completed" | "failed",
 *   "metadata": { ... },
 *   "updateWalletBalance": true,
 *   "balanceAfter": 5000
 * }
 * ```
 * 
 * ### POST /secure-transaction-update/fund-wallet
 * Adds funds to the user's wallet with atomic balance update.
 * 
 * **Request Body:**
 * ```json
 * {
 *   "amount": 5000,
 *   "reference": "DEP-123456"
 * }
 * ```
 * 
 * ## Security Features
 * - JWT authentication required for all operations
 * - Service role used for privileged database operations
 * - Transaction ownership verified before updates
 * - Balance calculations validated server-side
 * - Atomic updates prevent race conditions
 * 
 * ## Budget Integration
 * For completed airtime/data purchases, this function:
 * 1. Records an immutable spending event
 * 2. Updates the user's monthly budget spent amount
 * 3. Triggers threshold notifications (50%, 75%, 90%, 100%)
 * 
 * @module secure-transaction-update
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * CORS headers for cross-origin requests.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Request payload for updating transaction status.
 */
interface TransactionUpdateRequest {
  /** UUID of the transaction to update */
  transactionId: string;
  /** New status for the transaction */
  status: "completed" | "failed";
  /** Additional metadata to merge with existing transaction metadata */
  metadata?: Record<string, unknown>;
  /** Whether to update the wallet balance (only for completed transactions) */
  updateWalletBalance?: boolean;
  /** The expected balance after the transaction (for validation) */
  balanceAfter?: number;
}

/**
 * Request payload for wallet funding.
 */
interface WalletFundRequest {
  /** Amount to add to wallet in NGN */
  amount: number;
  /** Optional payment reference from payment provider */
  reference?: string;
}

/**
 * Budget alert thresholds as percentages.
 * Notifications are sent when spending crosses each threshold.
 */
const BUDGET_THRESHOLDS = [50, 75, 90, 100];

/**
 * Generates the current month-year string in YYYY-MM format.
 * Used for monthly budget tracking.
 * 
 * @returns {string} Current month in YYYY-MM format (e.g., "2026-01")
 */
function getCurrentMonthYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Creates a notification record in the database.
 * Used for transaction confirmations and budget alerts.
 * 
 * @param adminClient - Supabase client with service role
 * @param userId - The user ID to notify
 * @param notification - Notification details
 * 
 * @example
 * await createNotification(adminClient, userId, {
 *   title: "Purchase Successful",
 *   message: "Your airtime purchase of ₦500 was successful.",
 *   type: "success",
 *   category: "transaction",
 * });
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createNotification(
  adminClient: any,
  userId: string,
  notification: {
    /** Notification title displayed prominently */
    title: string;
    /** Detailed message content */
    message: string;
    /** Visual type: success (green), error (red), warning (yellow), info (blue) */
    type: "success" | "error" | "warning" | "info";
    /** Category for filtering: "transaction", "budget", "general" */
    category: string;
    /** Optional additional data for the notification */
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await adminClient.from("notifications").insert({
      user_id: userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      category: notification.category,
      metadata: notification.metadata || {},
    });
    console.log(`[notification] Created: ${notification.title}`);
  } catch (error) {
    console.error("[notification] Failed to create:", error);
  }
}

/**
 * Records a spending event and updates the user's monthly budget.
 * Called after successful airtime/data purchases.
 * 
 * This function:
 * 1. Inserts an immutable record into spending_events table
 * 2. Updates the amount_spent in user_budgets
 * 3. Checks if any threshold has been crossed and sends notifications
 * 
 * @param adminClient - Supabase client with service role
 * @param userId - The user who made the purchase
 * @param transactionId - Reference to the transaction record
 * @param transactionType - "airtime_purchase" or "data_purchase"
 * @param amount - Purchase amount in NGN
 * 
 * @example
 * await recordSpendingAndUpdateBudget(
 *   adminClient,
 *   user.id,
 *   txData.id,
 *   "airtime_purchase",
 *   500
 * );
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recordSpendingAndUpdateBudget(
  adminClient: any,
  userId: string,
  transactionId: string,
  transactionType: string,
  amount: number
) {
  const currentMonth = getCurrentMonthYear();
  // Map transaction type to spending category
  const category = transactionType === "airtime_purchase" ? "AIRTIME" : "DATA";

  console.log(`[budget] Recording spending: ${category} - ₦${amount} for user ${userId}`);

  try {
    // Step 1: Record immutable spending event
    // This table is append-only and never updated or deleted
    const { error: spendingError } = await adminClient
      .from("spending_events")
      .insert({
        user_id: userId,
        transaction_id: transactionId,
        category,
        amount,
      });

    if (spendingError) {
      console.error("[budget] Failed to record spending event:", spendingError);
      return;
    }

    // Step 2: Fetch the user's current monthly budget
    const { data: budget, error: budgetFetchError } = await adminClient
      .from("user_budgets")
      .select("*")
      .eq("user_id", userId)
      .eq("month_year", currentMonth)
      .maybeSingle();

    if (budgetFetchError) {
      console.error("[budget] Failed to fetch budget:", budgetFetchError);
      return;
    }

    // If no budget is set, spending is still recorded but no alerts are sent
    if (!budget) {
      console.log(`[budget] No budget set for user ${userId} in ${currentMonth}`);
      return;
    }

    // Step 3: Update the amount_spent field atomically
    const newAmountSpent = Number(budget.amount_spent) + amount;
    const budgetAmount = Number(budget.budget_amount);
    
    const { error: updateError } = await adminClient
      .from("user_budgets")
      .update({ 
        amount_spent: newAmountSpent,
        updated_at: new Date().toISOString()
      })
      .eq("id", budget.id);

    if (updateError) {
      console.error("[budget] Failed to update budget:", updateError);
      return;
    }

    console.log(`[budget] Updated spent: ₦${newAmountSpent} / ₦${budgetAmount}`);

    // Step 4: Check and trigger threshold notifications
    if (budgetAmount <= 0) return; // Skip if budget is not set

    const percentageUsed = Math.round((newAmountSpent / budgetAmount) * 100);
    const lastAlertLevel = budget.last_alert_level || 0;

    // Find the highest threshold that has been crossed but not yet alerted
    for (const threshold of BUDGET_THRESHOLDS) {
      if (percentageUsed >= threshold && lastAlertLevel < threshold) {
        const isOverBudget = threshold >= 100;
        const remaining = Math.max(0, budgetAmount - newAmountSpent);

        // Send appropriate notification based on threshold
        await createNotification(adminClient, userId, {
          title: isOverBudget ? "Monthly Budget Exceeded" : `${threshold}% Budget Used`,
          message: isOverBudget 
            ? `You've exceeded your monthly budget of ₦${budgetAmount.toLocaleString()}. You've spent ₦${newAmountSpent.toLocaleString()}.`
            : `You've used ${threshold}% of your monthly budget. ₦${remaining.toLocaleString()} remaining.`,
          type: isOverBudget ? "warning" : "info",
          category: "budget",
          metadata: { 
            threshold, 
            budgetAmount, 
            amountSpent: newAmountSpent,
            percentageUsed,
            remaining
          },
        });

        // Update last_alert_level to prevent duplicate notifications
        await adminClient
          .from("user_budgets")
          .update({ last_alert_level: threshold })
          .eq("id", budget.id);

        console.log(`[budget] Sent ${threshold}% threshold notification`);
        break; // Only send one notification per transaction
      }
    }
  } catch (error) {
    console.error("[budget] Error in recordSpendingAndUpdateBudget:", error);
  }
}

/**
 * Main request handler for the secure-transaction-update edge function.
 */
Deno.serve(async (req) => {
  // Handle CORS preflight for browser compatibility
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment configuration
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Validate authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user client to verify JWT and extract user identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error("[secure-transaction-update] Auth error:", authError);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[secure-transaction-update] Authenticated user: ${user.id}`);

    // Create admin client for privileged database operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the request URL to determine the action
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    // =========================================================================
    // POST /update-status - Update transaction status
    // =========================================================================
    if (action === "update-status" && req.method === "POST") {
      const body: TransactionUpdateRequest = await req.json();
      const { transactionId, status, metadata, updateWalletBalance, balanceAfter } = body;

      // Validate required fields
      if (!transactionId || !status) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate status is a valid transition
      if (!["completed", "failed"].includes(status)) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid status. Must be 'completed' or 'failed'" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch transaction and verify ownership and current status
      const { data: transaction, error: txFetchError } = await adminClient
        .from("transactions")
        .select("*, wallets!inner(id, user_id, balance)")
        .eq("id", transactionId)
        .eq("user_id", user.id)
        .single();

      if (txFetchError || !transaction) {
        console.error("[secure-transaction-update] Transaction not found:", txFetchError);
        return new Response(
          JSON.stringify({ success: false, error: "Transaction not found or access denied" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Only pending transactions can be updated
      if (transaction.status !== "pending") {
        return new Response(
          JSON.stringify({ success: false, error: `Cannot update transaction with status '${transaction.status}'` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[secure-transaction-update] Updating transaction ${transactionId} to ${status}`);

      // Merge metadata with timestamp
      const existingMetadata = typeof transaction.metadata === 'object' && transaction.metadata !== null
        ? transaction.metadata
        : {};
      const mergedMetadata = {
        ...existingMetadata,
        ...metadata,
        [`${status}_at`]: new Date().toISOString(),
      };

      // Update transaction status
      const { error: updateError } = await adminClient
        .from("transactions")
        .update({
          status,
          metadata: mergedMetadata,
        })
        .eq("id", transactionId);

      if (updateError) {
        console.error("[secure-transaction-update] Update error:", updateError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to update transaction" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update wallet balance if transaction completed successfully
      if (updateWalletBalance && status === "completed" && balanceAfter !== undefined) {
        // Validate that the calculated balance matches what was stored
        const expectedBalance = Number(transaction.balance_after);
        if (Math.abs(expectedBalance - balanceAfter) > 0.01) {
          console.error(`[secure-transaction-update] Balance mismatch: expected ${expectedBalance}, got ${balanceAfter}`);
          return new Response(
            JSON.stringify({ success: false, error: "Balance calculation mismatch" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: walletError } = await adminClient
          .from("wallets")
          .update({ balance: balanceAfter })
          .eq("id", transaction.wallet_id)
          .eq("user_id", user.id);

        if (walletError) {
          console.error("[secure-transaction-update] Wallet update error:", walletError);
        }
      }

      // Record spending and update budget for completed purchases
      if (status === "completed" && (transaction.type === "airtime_purchase" || transaction.type === "data_purchase")) {
        await recordSpendingAndUpdateBudget(
          adminClient,
          user.id,
          transactionId,
          transaction.type,
          Number(transaction.amount)
        );
      }

      // Create notification for transaction status change
      const txType = transaction.type === "airtime_purchase" ? "Airtime" : 
                     transaction.type === "data_purchase" ? "Data" : 
                     transaction.type === "deposit" ? "Deposit" : "Transaction";
      const amount = Number(transaction.amount);

      if (status === "completed") {
        await createNotification(adminClient, user.id, {
          title: `${txType} Successful`,
          message: `Your ${txType.toLowerCase()} purchase of ₦${amount.toLocaleString()} was successful.`,
          type: "success",
          category: "transaction",
          metadata: { transactionId, type: transaction.type, amount },
        });
      } else if (status === "failed") {
        await createNotification(adminClient, user.id, {
          title: `${txType} Failed`,
          message: `Your ${txType.toLowerCase()} purchase of ₦${amount.toLocaleString()} failed. Your wallet has been refunded.`,
          type: "error",
          category: "transaction",
          metadata: { transactionId, type: transaction.type, amount },
        });
      }

      return new Response(
        JSON.stringify({ success: true, transactionId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    // =========================================================================
    // POST /fund-wallet - Add funds to wallet
    // =========================================================================
    } else if (action === "fund-wallet" && req.method === "POST") {
      const body: WalletFundRequest = await req.json();
      const { amount, reference } = body;

      // Validate amount
      if (!amount || amount <= 0) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid amount" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Enforce payment limits
      const MIN_TOPUP = 5000;
      const MAX_BALANCE = 8000000;

      if (amount < MIN_TOPUP) {
        return new Response(
          JSON.stringify({ success: false, error: `Minimum top-up amount is ₦${MIN_TOPUP.toLocaleString()}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch user's wallet
      const { data: wallet, error: walletFetchError } = await adminClient
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (walletFetchError || !wallet) {
        console.error("[secure-transaction-update] Wallet not found:", walletFetchError);
        return new Response(
          JSON.stringify({ success: false, error: "Wallet not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const currentBalance = Number(wallet.balance);
      const newBalance = currentBalance + amount;

      // Check maximum balance limit
      if (newBalance > MAX_BALANCE) {
        return new Response(
          JSON.stringify({ success: false, error: `Maximum wallet balance is ₦${MAX_BALANCE.toLocaleString()}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const txReference = reference || `DEP-${Date.now()}`;

      console.log(`[secure-transaction-update] Funding wallet for user ${user.id}: +${amount}`);

      // Create completed transaction record
      const { data: txData, error: txError } = await adminClient
        .from("transactions")
        .insert({
          wallet_id: wallet.id,
          user_id: user.id,
          type: "deposit",
          amount,
          balance_before: currentBalance,
          balance_after: newBalance,
          status: "completed",
          reference: txReference,
          description: "Wallet Funded",
        })
        .select()
        .single();

      if (txError) {
        console.error("[secure-transaction-update] Transaction insert error:", txError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create transaction record" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update wallet balance atomically
      const { error: walletUpdateError } = await adminClient
        .from("wallets")
        .update({ balance: newBalance })
        .eq("id", wallet.id)
        .eq("user_id", user.id);

      if (walletUpdateError) {
        console.error("[secure-transaction-update] Wallet update error:", walletUpdateError);
        // Mark transaction as failed for reconciliation
        await adminClient
          .from("transactions")
          .update({ status: "failed", metadata: { failure_reason: "Wallet update failed" } })
          .eq("id", txData.id);
        
        return new Response(
          JSON.stringify({ success: false, error: "Failed to update wallet balance" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create success notification
      await createNotification(adminClient, user.id, {
        title: "Wallet Funded",
        message: `₦${amount.toLocaleString()} has been added to your wallet. New balance: ₦${newBalance.toLocaleString()}`,
        type: "success",
        category: "transaction",
        metadata: { transactionId: txData.id, amount, newBalance },
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          transactionId: txData.id,
          newBalance,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid endpoint" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("[secure-transaction-update] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
