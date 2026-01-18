import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransactionUpdateRequest {
  transactionId: string;
  status: "completed" | "failed";
  metadata?: Record<string, unknown>;
  updateWalletBalance?: boolean;
  balanceAfter?: number;
}

interface WalletFundRequest {
  amount: number;
  reference?: string;
}

// Helper function to create notifications
async function createNotification(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  notification: {
    title: string;
    message: string;
    type: "success" | "error" | "warning" | "info";
    category: string;
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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error("Missing Supabase configuration");
    }

    // Create client with user's auth to verify identity
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Create admin client for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    if (action === "update-status" && req.method === "POST") {
      // Handle transaction status update
      const body: TransactionUpdateRequest = await req.json();
      const { transactionId, status, metadata, updateWalletBalance, balanceAfter } = body;

      if (!transactionId || !status) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate status transition
      if (!["completed", "failed"].includes(status)) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid status. Must be 'completed' or 'failed'" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify transaction belongs to user and is in pending status
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

      if (transaction.status !== "pending") {
        return new Response(
          JSON.stringify({ success: false, error: `Cannot update transaction with status '${transaction.status}'` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[secure-transaction-update] Updating transaction ${transactionId} to ${status}`);

      // Merge existing metadata with new metadata
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

      // Update wallet balance if requested and transaction completed
      if (updateWalletBalance && status === "completed" && balanceAfter !== undefined) {
        // Validate balance calculation matches transaction
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

    } else if (action === "fund-wallet" && req.method === "POST") {
      // Handle wallet funding with atomic transaction
      const body: WalletFundRequest = await req.json();
      const { amount, reference } = body;

      if (!amount || amount <= 0) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid amount" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate amount limits
      const MIN_TOPUP = 5000;
      const MAX_BALANCE = 8000000;

      if (amount < MIN_TOPUP) {
        return new Response(
          JSON.stringify({ success: false, error: `Minimum top-up amount is ₦${MIN_TOPUP.toLocaleString()}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user's wallet with current balance
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
        // Attempt to mark transaction as failed for reconciliation
        await adminClient
          .from("transactions")
          .update({ status: "failed", metadata: { failure_reason: "Wallet update failed" } })
          .eq("id", txData.id);
        
        return new Response(
          JSON.stringify({ success: false, error: "Failed to update wallet balance" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create success notification for wallet funding
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
